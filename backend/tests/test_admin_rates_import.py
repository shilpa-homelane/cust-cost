"""Integration tests for the CSV bulk-import endpoint (POST /api/v1/admin/rates/import).

Each test runs against an isolated, file-backed SQLite DB (via the `ctx` fixture)
so nothing touches the real costing_tool.db. The router's `get_db` dependency is
overridden to point at the test engine.
"""

import types
from datetime import date

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.rate_db import Base, MasterRate
from app.routers import admin_rates

HEADER = "item_id,name,category,unit,price_per_unit,gst_percent\n"
ADMIN_ROLE = "Tech Admin"


@pytest.fixture
def ctx(tmp_path):
    db_path = tmp_path / "test.db"
    engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    app = FastAPI()
    app.include_router(admin_rates.router, prefix="/api/v1/admin")
    app.dependency_overrides[admin_rates.get_db] = _override_get_db(TestingSession)

    with TestClient(app) as client:
        yield types.SimpleNamespace(client=client, Session=TestingSession)


def _override_get_db(TestingSession):
    def _get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    return _get_db


def _upload(ctx, content, filename="rates.csv", role=ADMIN_ROLE):
    return ctx.client.post(
        "/api/v1/admin/rates/import",
        files={"file": (filename, content, "text/csv")},
        headers={"X-User-Role": role},
    )


def _seed_rate(ctx, item_id, rate=50.0):
    db = ctx.Session()
    db.add(
        MasterRate(
            item_id=item_id,
            category="board",
            name="Existing",
            master_sku=item_id,
            unit="sft",
            rate=rate,
            gst_percent=18.0,
            valid_from=date.today(),
            valid_to=None,
            in_catalogue=True,
        )
    )
    db.commit()
    db.close()


# ── Happy path ────────────────────────────────────────────────────────────────

def test_valid_row_is_imported_and_stored(ctx):
    res = _upload(ctx, HEADER + "ITM-900,Test Board,board,sft,110.0,18.0\n")

    assert res.status_code == 200
    body = res.json()
    assert body == {"rows_added": 1, "rows_skipped": 0, "errors": []}

    db = ctx.Session()
    rate = db.query(MasterRate).filter_by(item_id="ITM-900").one()
    assert rate.rate == 110.0
    assert rate.master_sku == "ITM-900"  # defaulted from item_id
    assert rate.in_catalogue is True
    assert rate.valid_to is None
    db.close()


def test_master_sku_from_csv_is_used_when_present(ctx):
    csv_data = (
        "item_id,name,category,unit,price_per_unit,gst_percent,master_sku\n"
        "ITM-909,Custom,board,sft,10,18,SKU-XYZ\n"
    )
    res = _upload(ctx, csv_data)

    assert res.json()["rows_added"] == 1
    db = ctx.Session()
    assert db.query(MasterRate).filter_by(item_id="ITM-909").one().master_sku == "SKU-XYZ"
    db.close()


def test_bom_prefixed_header_still_detects_columns(ctx):
    # utf-8-sig BOM on the header must not break required-column detection.
    res = _upload(ctx, "﻿" + HEADER + "ITM-912,Bom Item,board,sft,10,18\n")

    assert res.status_code == 200
    assert res.json()["rows_added"] == 1


# ── Regression: short / ragged rows must not crash the import ──────────────────

def test_short_row_is_reported_not_crashed(ctx):
    # A row with fewer columns than the header previously made csv.DictReader
    # fill the gaps with None, and `None.strip()` raised AttributeError -> 500,
    # aborting the whole import. It must now surface as a per-row error.
    res = _upload(ctx, HEADER + "ITM-901,Widget,board\n")

    assert res.status_code == 200
    body = res.json()
    assert body["rows_added"] == 0
    assert len(body["errors"]) == 1
    assert body["errors"][0]["row"] == 2
    assert body["errors"][0]["item_id"] == "ITM-901"


def test_good_rows_commit_even_when_a_short_row_is_present(ctx):
    csv_data = (
        HEADER
        + "ITM-920,Good One,board,sft,100,18\n"
        + "ITM-921,Short Row,board\n"  # missing unit/price/gst
        + "ITM-922,Good Two,board,sft,200,18\n"
    )
    res = _upload(ctx, csv_data)

    body = res.json()
    assert body["rows_added"] == 2
    assert len(body["errors"]) == 1
    db = ctx.Session()
    assert db.query(MasterRate).count() == 2
    db.close()


# ── Regression: non-finite / negative numbers must be rejected ─────────────────

@pytest.mark.parametrize("bad_price", ["inf", "-inf", "nan", "-5", "1e400"])
def test_non_finite_or_negative_price_is_rejected(ctx, bad_price):
    res = _upload(ctx, HEADER + f"ITM-902,Bad,board,sft,{bad_price},18.0\n")

    body = res.json()
    assert body["rows_added"] == 0, f"{bad_price!r} should not be imported"
    assert len(body["errors"]) == 1
    db = ctx.Session()
    assert db.query(MasterRate).count() == 0
    db.close()


def test_non_numeric_price_is_rejected(ctx):
    res = _upload(ctx, HEADER + "ITM-905,Bad Price,board,sft,abc,18.0\n")

    body = res.json()
    assert body["rows_added"] == 0
    assert len(body["errors"]) == 1
    assert body["errors"][0]["item_id"] == "ITM-905"


# ── Field-level validation ─────────────────────────────────────────────────────

def test_blank_required_field_is_rejected(ctx):
    res = _upload(ctx, HEADER + "ITM-906,,board,sft,100,18\n")  # empty name

    body = res.json()
    assert body["rows_added"] == 0
    assert "name" in body["errors"][0]["reason"]


def test_empty_item_id_is_reported_with_null_id(ctx):
    res = _upload(ctx, HEADER + ",No Id,board,sft,100,18\n")

    body = res.json()
    assert body["rows_added"] == 0
    assert body["errors"][0]["reason"] == "item_id is empty"
    assert body["errors"][0]["item_id"] is None


# ── Skip semantics (append-only history preserved) ─────────────────────────────

def test_existing_active_item_is_skipped_and_preserved(ctx):
    _seed_rate(ctx, "ITM-907", rate=50.0)
    res = _upload(ctx, HEADER + "ITM-907,Dup,board,sft,999,18\n")

    body = res.json()
    assert body["rows_added"] == 0
    assert body["rows_skipped"] == 1

    db = ctx.Session()
    rates = db.query(MasterRate).filter_by(item_id="ITM-907").all()
    assert len(rates) == 1  # not overwritten, no second active row created
    assert rates[0].rate == 50.0
    db.close()


def test_duplicate_item_id_within_same_csv_is_skipped(ctx):
    csv_data = HEADER + "ITM-908,First,board,sft,10,18\nITM-908,Second,board,sft,20,18\n"
    res = _upload(ctx, csv_data)

    body = res.json()
    assert body["rows_added"] == 1
    assert body["rows_skipped"] == 1


# ── File / header level errors ─────────────────────────────────────────────────

def test_missing_required_columns_returns_400(ctx):
    res = _upload(ctx, "item_id,name\nITM-910,Foo\n")

    assert res.status_code == 400
    assert "missing required columns" in res.json()["detail"].lower()


def test_non_csv_extension_returns_400(ctx):
    res = _upload(ctx, "whatever", filename="rates.txt")

    assert res.status_code == 400
    assert "csv" in res.json()["detail"].lower()


def test_empty_file_returns_400(ctx):
    res = _upload(ctx, "")

    assert res.status_code == 400


# ── Authorization ──────────────────────────────────────────────────────────────

def test_import_forbidden_without_admin_role(ctx):
    res = _upload(ctx, HEADER + "ITM-911,Foo,board,sft,10,18\n", role="Designer")

    assert res.status_code == 403
