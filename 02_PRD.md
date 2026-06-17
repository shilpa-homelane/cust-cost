# Product Requirements Document: Custom Costing Tool v1

**Product name (working):** Custom Costing Tool
**Author:** Product/Strategy
**Stakeholders:** Design, D2M, Procurement, Engineering, Leadership
**Status:** Draft for engineering review
**Date:** May 2026
**Companion document:** `01_Problem_Definition.md`

---

## 1. Product overview

### 1.1 What the product does

The Custom Costing Tool is a web-based application accessed via a laptop browser that allows HomeLane and DesignCafe designers to generate accurate, customer-ready quotes for custom (non-catalogue) furniture units in under 5 minutes, at the designer's table. It replaces a 3–4 day manual costing process with a real-time, self-service workflow.

The customer shares the design PDF or a raw mobile phone photo via WhatsApp. The designer uploads the document; the system uses AI to extract structured information (dimensions, finishes, counts, premium features) from the document; the designer reviews and corrects the extraction; the system computes a Bill of Materials using deterministic manufacturing rules; the system computes a quote using current rates from a Procurement-owned Master database; and the system produces both a customer-facing quote PDF and an internal cost breakdown.

### 1.2 Primary user

**HomeLane or DesignCafe designer** operating at the table inside a showroom or experience center. The customer may be physically present sitting right next to them, or on a video/audio call. The designer is familiar with SketchUp / Foyr, fluent in the design language of the brand, not necessarily comfortable with technical costing details. Wants to close the deal at the table without back-office friction.

### 1.3 Secondary users

- **D2M (Design-to-Manufacturing) analyst** — maintains the Feature Library of premium-feature cost models. Audits accuracy of tool quotes against actual billed amounts. Consumes the internal BOM output as input for production cutlists.
- **Procurement analyst** — maintains the Master rate database. Updates rates when vendor pricing changes.
- **Senior designer / regional manager** — reviews and approves quotes above a threshold (if such an approval workflow is enabled).

### 1.4 Out of scope for v1

- Customer-facing self-serve quote generation (no customer logins)
- Mobile-native app (responsive web only)
- Multi-unit bundled quotes (one unit per quote in v1)
- Quote-to-order automation (handoff to existing CRM/quotation stays manual)
- SketchUp/AutoCAD source file parsing (PDF and raw photo input only)
- Multiple finish-option variants ("show me 3 options side by side")
- Automated learning loop where actuals feed back into the Feature Library (manual D2M updates in v1)
- Customer-facing PDF templating beyond a single clean design

---

## 2. Architecture overview

The system has three sequential pipeline stages plus three persistent data stores:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   STEP 1                  STEP 2                STEP 3              │
│  ┌────────┐             ┌────────┐            ┌────────┐            │
│  │ PDF /  │             │ JSON → │            │ BOM →  │            │
│  │ Photo→ │             │  BOM   │ ─BOM rows→ │ Quote  │ ──► Quote  │
│  │ (AI)   │   JSON      │ (rules)│            │ (rules)│     PDF    │
│  └────────┘             └────────┘            └────────┘            │
│      ▲                      ▲                     ▲                 │
│      │                      │                     │                 │
│      │              ┌───────┴────────┐            │                 │
│      │              │ Feature Library│            │                 │
│      │              │   (D2M owned)  │            │                 │
│      │              └────────────────┘            │                 │
│      │                                            │                 │
│      │              ┌─────────────────────────────┴──┐              │
│      │              │ Master Rate DB (Procurement owned)            │
│      │              └────────────────────────────────┘              │
│      │                                                              │
│      │              ┌────────────────┐                              │
│      └──Designer────│ Confirm UI     │                              │
│         confirms    │ (Web app)      │                              │
│                     └────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
```

**Step 1 is AI. Steps 2 and 3 are deterministic code.** This separation is deliberate: AI is good at interpretation under uncertainty (reading drawings) but should not own deterministic logic (manufacturing rules, rate lookups, margin math). Splitting them gives accuracy, auditability, and the ability for D2M and Procurement to own their respective domains without engineering involvement for routine updates.

---

## 3. Functional requirements

### 3.1 Step 1: Design interpretation (AI extraction)

**FR-1.1** The system shall accept PDF and image (raw photos, JPEG, PNG) uploads up to 20 MB and up to 30 pages.

**FR-1.2** The system shall pass the PDF or image to a vision-capable LLM (Claude, GPT-4o, or Gemini — configurable) with a structured-output prompt.

**FR-1.3** The system shall produce a structured JSON object conforming to a defined extraction schema, alongside a **Human-Readable Summary** detailing assumptions and reasoning to build designer trust. The JSON shall include these top-level fields:
- `document_classification` (pdf_type e.g. annotated_elevation / structured_detail_sheet / minimal_sketch / reference_image_only, num_units_described, brand)
- `unit_identification` (unit name, SKU reference, customer ID)
- `archetype` (one of: tall_storage_with_shutters, base_storage_with_shutters, open_shelving_frame, floating_unit, wardrobe, custom_panelling, other)
- `dimensions` (length, height, carcass depth, shutter depth — all in mm, all nullable)
- `counts` (shutters, drawers, skirting drawer, fixed shelves, adjustable shelves, vertical partitions, back panel, hanger rods)
- `finishes` (carcass material, internal finish, two external shutter finishes, expo sides + finish, skirting finish)
- `hardware` (handle SKU/size/finish, hinge type, channel type, handle-in-client-scope flag)
- `premium_features` (array of detected features, each with feature type, parameters, confidence, source)
- `consistency_warnings` (array of plain-English warnings about inconsistencies)
- `missing_information` (array of fields that downstream costing will need but couldn't be extracted)
- `extraction_metadata` (overall confidence, fields needing designer review)

**FR-1.4** Every extracted value shall include a confidence indicator (`high` / `medium` / `low`) and a source pointer ("Page 3 Details form", "elevation drawing on page 4 near top-right callout").

**FR-1.5** The system shall strictly prioritize **manufacturability over artistic flair** and enforce that **null is better than a guess**. It shall return `null` for any value that cannot be determined from the input. It shall not estimate, infer, or guess numeric values from visual proportions.

**FR-1.6** For documents with multiple units (`num_units_described` > 1), the system shall extract only the first unit and clearly state in the JSON and via a prominent UI banner that additional units exist and need separate processing.

**FR-1.7** If `document_classification.pdf_type` is identified as `reference_image_only` (e.g., mood boards, Pinterest photos), the system shall not attempt extraction of dimensions and shall instead throw a critical warning that structured drawings are required for accurate costing.

**FR-1.8** Extraction shall complete within 30 seconds for typical PDFs (under 10 pages) and single images; the UI shall show progressive feedback during extraction (text-layer parsing done, rendering done, AI analyzing, catalogue matching, consistency checks).

**FR-1.9** Every designer correction to an extracted value shall be logged with the original AI value, the corrected value, the field path, the confidence at time of extraction, and a reference to the source document. This log becomes the dataset for v2 extraction improvements.

### 3.2 Step 2: BOM generation (deterministic rules engine)

**FR-2.1** The BOM engine shall accept the extraction JSON as input and produce a structured list of BOM line items. Each line item shall include:
- Category (board, laminate, surface_finish, glass, hardware, labour, miscellaneous)
- Item name (human-readable)
- Master SKU (lookup key into the Master Rate DB)
- Quantity
- Unit (sft, rft, sheet, nos)
- Wastage % (where applicable)
- Notes (human-readable trace of how the quantity was derived)
- Rule ID (which archetype or feature rule produced this line, for traceability)
- Feature ID (if the line was added by a feature rule)

**FR-2.2** The BOM engine shall implement deterministic manufacturing rules for at least the following archetypes in v1:
- Tall storage with shutters (wardrobes, foyer talls, crockery uppers)
- Base storage with shutters (foyer base, vanity, crockery lowers)
- Open shelving / frame (TV unit frames, ledges)
- Floating unit (wall-mounted asymmetric drawers and consoles)
- Wardrobe (tall storage with hanging space + drawers + shelves)

**FR-2.3** Each archetype's rules shall be written in plain Python (or equivalent), commented with the manufacturing reasoning, and structured so that a D2M analyst with basic technical literacy can read, audit, and propose updates without engineering intervention.

**FR-2.4** The BOM engine shall apply hinge counts as a function of shutter height (2 hinges up to 900mm, 3 up to 1800mm, 4 up to 2400mm, 5 above) and similar standard manufacturing rules. These rules shall be parameterised and reviewable.

**FR-2.5** The BOM engine shall match free-text finish names from the extraction (e.g. "Cana Walnut SF", "DC Gold commercial ply") to Master SKUs via fuzzy matching. Unmatched finishes shall be flagged for designer action.

**FR-2.6** The BOM engine shall produce an empty BOM with a clear warning if core dimensions (length, height, depth) are missing — it shall not produce a partial BOM with fabricated assumptions.

### 3.3 Feature Library (D2M-owned)

**FR-3.1** The system shall implement a Feature Library containing cost-model functions for premium features. Each feature handler shall:
- Read its specific parameters from the extraction's `premium_features` array
- Add zero or more BOM lines representing the feature's material, labour, and/or hardware impact
- Tag every added line with a `feature_id` for traceability and audit

**FR-3.2** v1 shall include calibrated cost models for at least the following features:
- Curved edges (parameters: radius_mm, curve_count, applies_to)
- Jaali pattern (parameters: panel_area_sft, jaali_type, applies_to)
- Asymmetric expo (parameters: expo_sides, expo_finish)
- Glass shutter (parameters: glass_type, area_sft)
- Fluted glass (parameters: glass_type, area_sft, applies_to)
- Cane finish (parameters: panel_area_sft, backing, applies_to)
- Laminate cut-and-paste pattern (parameters: pattern_area_sft, num_colors, complexity)
- Arch cutout (parameters: arch_height_mm, arch_width_mm, applies_to)
- Mirror inset (parameters: area_sft, mirror_type)
- Internal lighting (parameters: running_length_mm, profile_type)
- Bevelled edges (parameters: edge_length_mm, applies_to)
- Open back / no panel (parameters: applies_to)
- Decorative skirting drawer (parameters: drawer_count, finish)
- Groove detailing / routed pattern (parameters: pattern_type, area_sft, applies_to)

**FR-3.3** Each feature handler's cost model shall be calibrated against at least 5 past D2M project actuals before launch. Cost models that cannot be calibrated shall be marked as "experimental" and shall apply a default 10% confidence buffer to the affected quote.

**FR-3.4** Adding a new feature shall require: writing one new handler function, registering it in the feature handler map, and recording the calibration source. No changes to archetype rules shall be required.

**FR-3.5** The Feature Library shall be versioned. Past quotes shall reference the feature library version they were costed against, so changing a feature's cost model later does not silently alter historical quotes.

### 3.4 Step 3: Costing engine (deterministic rules engine)

**FR-4.1** The costing engine shall accept the BOM as input and produce a priced quote with full line-item breakdown.

**FR-4.2** For each BOM line, the engine shall:
- Look up the current rate from the Master Rate DB by Master SKU
- Apply the line's wastage percentage
- Compute the line subtotal

**FR-4.3** The engine shall then apply, in order:
- Sum of all line subtotals → Cost of Goods Sold (COGS) base
- Miscellaneous overhead (default 2.5%, configurable per brand)
- Transportation (default 3–5%, configurable)
- Vendor margin (default 15%, configurable)
- Brand margin (HL: default 40%; DC: configurable separately)
- Confidence buffer (asymmetric, computed per feature; well-calibrated features: 0%; experimental: 5–10%)
- GST (18%, applied to final customer price line)

**FR-4.4** The output shall include two artifacts:
- **Customer-facing quote PDF** — clean, branded, includes unit drawing reference, finish summary, total price with GST. No internal margin breakdown.
- **Internal cost sheet** — full BOM with line-by-line costs, all percentage applications visible, confidence buffer breakdown, rate-set version used.

**FR-4.5** Every quote shall be stamped with: quote ID, customer ID, brand, rate-set version, feature library version, designer ID, timestamp. Quotes shall be retrievable from history.

**FR-4.6** Margin parameters shall be adjustable in the UI for designers with appropriate permissions. Margin adjustments shall be logged and auditable.

### 3.5 Master Rate Database (Procurement-owned)

**FR-5.1** The Master Rate DB shall store every material, hardware, labour, and overhead rate as a structured row with:
- `item_id` (stable identifier)
- `category` (board, laminate, surface_finish, glass, hardware, labour, miscellaneous, polish, adhesive, transport)
- `name` (human-readable, e.g. "BWP ply 18mm")
- `master_sku` (lookup key referenced by the BOM engine)
- `unit` (sheet, sft, nos, kg, rft)
- `rate` (numeric, current)
- `gst_percent` (numeric)
- `applicable_vendor` (Greenpanel, Action Tessa, Century, etc.)
- `valid_from` (date)
- `valid_to` (date; null if currently active)
- `in_catalogue` (boolean — flags finishes that exist in the standard catalogue)

**FR-5.2** Procurement shall have a web-based admin interface for adding, updating, and deprecating rate rows. No engineering involvement shall be needed for routine rate updates.

**FR-5.3** Rate changes shall create a new `valid_from` row rather than overwriting the existing rate. The DB shall be append-only with respect to rate history, so past quotes always have access to the rates they were costed with.

**FR-5.4** The DB shall support fuzzy lookup so the BOM engine can match free-text finish names from extractions (e.g. "DC Gold commercial ply", "Cana Walnut SF") to canonical SKUs.

### 3.6 Designer-facing UI

**FR-6.1** The UI shall be a two-pane web interface: document preview on the left, structured form on the right.

**FR-6.2** The left pane shall render the uploaded PDF or image (with zoom and pan), and shall overlay bounding boxes on the AI's detected fields so the designer can verify visually that the AI looked at the right number.

**FR-6.3** The right pane shall display the extracted fields in editable form groups:
- Unit specification (archetype, brand, dimensions)
- Components (counts of shutters, drawers, shelves, partitions, hanger rods, back panel, skirting drawer)
- Finishes & materials (carcass, internal, shutter primary, shutter secondary, expo, skirting)
- Hardware (handles, hinges, channels)
- Premium features (toggleable, with parameters and live incremental price)

**FR-6.4** Every extracted field shall display a confidence badge (high/verify/missing) with a hover tooltip showing the source ("Page 3: 'Dimensions-WxD x H- 470 x 380 + 20 x 2000'").

**FR-6.5** Fields the AI marked as `missing` or `low confidence` shall be visually flagged (e.g. dashed amber border) and shall require designer acknowledgement before the quote can be finalised.

**FR-6.6** Consistency warnings from the extraction shall be displayed in a dedicated panel above the form, along with the **Human-Readable Summary** that explains the AI's assumptions. The designer shall be required to resolve or dismiss each warning.

**FR-6.6.1** If `num_units_described` > 1, the UI must display a persistent banner stating: *"Note: This document contains multiple units. This quote has only been generated for Unit 1. Please generate separate quotes for the other units."*

**FR-6.6.2** If `pdf_type` is `reference_image_only`, the UI must block quote generation and prompt the user: *"This looks like an inspiration photo. Dimensions and counts cannot be safely inferred for costing. Please upload a structured sketch or detail sheet."*

**FR-6.7** The Premium Features panel shall:
- Pre-check features the AI detected
- Show all available features (including undetected) so the designer can add features the AI missed
- Display incremental price for each feature as it is toggled
- Allow parameter editing per feature (e.g. curve radius, jaali area)

**FR-6.8** A sticky footer shall display the live quote total, broken into Base unit + Premium features + Confidence buffer = Total (incl. margin). The total shall update in real time as the designer edits fields or toggles features.

**FR-6.9** The footer shall include actions: "Save draft" (persists state without finalising), "Generate quote PDF" (produces both customer and internal artifacts), and a re-extract option (re-runs Step 1).

**FR-6.10** The UI shall be fully functional even if the AI extraction layer is unavailable — the designer can type all inputs manually, replicating today's Excel experience but with central rate sync and proper output formatting.

**FR-6.11** **Presentation Mode** shall be ENABLED by default at all times, masking all internal margin percentages, markups, and raw cost data from the screen. The designer can manually disable it to view the internal costing breakdown if they wish to do so.

### 3.7 Authentication and authorisation

**FR-7.1** Authentication shall use the organisation's existing SSO (Okta or Google). No new credentials shall be required for designers.

**FR-7.2** Role-based permissions shall include:
- **Designer** — create quotes, edit own quote drafts, view own quote history
- **Senior designer** — all of Designer + adjust margins within a defined range
- **D2M analyst** — view all quotes, update Feature Library, view feature library version history
- **Procurement analyst** — update Master Rate DB, view rate change history
- **Admin** — all of the above + manage users and roles

---

## 4. Non-functional requirements

### 4.1 Performance

- **NFR-1.1** Document upload to extraction complete: P50 under 15 seconds, P95 under 30 seconds.
- **NFR-1.2** BOM generation from confirmed extraction: under 500ms.
- **NFR-1.3** Quote generation (BOM → priced PDF): under 2 seconds.
- **NFR-1.4** Total designer workflow time (upload → reviewed quote PDF): target under 5 minutes, P95 under 8 minutes.

### 4.2 Accuracy

- **NFR-2.1** Quote accuracy target: 90% of completed orders within ±10% of the tool's quote, measured against final billed amount over a rolling 90-day window.
- **NFR-2.2** Extraction field accuracy target (pre-designer correction): 80% of fields correctly extracted with appropriate confidence levels, measured against a labelled test set of 50 documents (PDFs and photos).
- **NFR-2.3** Asymmetric error preference: when in doubt, quote slightly higher rather than slightly lower. Confidence buffer per feature is the mechanism.

### 4.3 Auditability and traceability

- **NFR-3.1** Every BOM line shall be traceable to (a) the archetype or feature rule that produced it, and (b) the source field in the extraction JSON it was derived from.
- **NFR-3.2** Every quote shall be reproducible from its stored state — given the same extraction JSON, the same feature library version, and the same rate-set version, the system shall produce the same quote.
- **NFR-3.3** All designer corrections, margin adjustments, and feature toggles shall be logged.

### 4.4 Maintainability

- **NFR-4.1** D2M shall be able to update any feature's cost model and deploy the change without an engineering deploy cycle. (Implementation: feature library functions live in a config-style file editable via admin UI, OR are reviewed via pull request with a 24-hour turnaround.)
- **NFR-4.2** Procurement shall be able to add, update, or deprecate any rate row via the admin UI with no engineering involvement.
- **NFR-4.3** Adding a new archetype shall be a bounded engineering task (estimated under 1 week of one engineer + 1 week of one D2M analyst's input).

### 4.5 Security and privacy

- **NFR-5.1** Customer IDs and quote contents are commercial-sensitive data. Access shall be limited to authenticated users with role-appropriate permissions.
- **NFR-5.2** Document uploads shall be stored in secure object storage (S3 equivalent) with encryption at rest.
- **NFR-5.3** Margin data shall not appear in any customer-facing artifact.

### 4.6 Scalability

- **NFR-6.1** v1 target volume: 500 quotes per month across HL + DC combined.
- **NFR-6.2** v1 shall be designed for 10x growth (5,000 quotes/month) without architectural rework.

---

## 5. Technology stack

### 5.1 Recommended stack

| Layer | Choice | Reasoning |
|---|---|---|
| Frontend | React + TypeScript + Tailwind | Mature ecosystem, typed end-to-end pairing with backend, fast UI iteration |
| Document rendering | PDF.js (via react-pdf) and native <img> | In-browser rendering with overlay support for AI bounding boxes |
| Backend | Python + FastAPI | Mature document processing libraries (pdfplumber, pdf2image, PIL), readable rules code for D2M, Pydantic schema validation pairs with TypeScript |
| BOM/costing engine | Python (in the same backend service) | Manufacturing rules are most readable in Python; near-spreadsheet syntax |
| Vision LLM | Claude Sonnet (with swappable provider interface) | Strong vision + structured output, good cost/quality at v1 volume; provider-agnostic interface allows A/B testing |
| Database | PostgreSQL | Structured data for quotes, rate sets, feature library; standard, well-supported |
| Object storage | S3 (or equivalent) | Uploaded documents and rendered images |
| Cache | Redis | Extraction result caching, avoiding re-extraction of identical documents |
| Auth | Org SSO (Okta or Google) | Per organisation standard |

### 5.2 Why these choices

The combination above is chosen for one reason above all: **the deterministic logic must be readable by D2M and Procurement, not just engineers.** Python's spreadsheet-like syntax for BOM and costing logic is a deliberate choice. React for the frontend is the default for an internal SaaS-style tool with rich interactivity. Postgres for the DB is the obvious choice for structured rate and quote data with audit history.

The vision LLM choice is the only externally-dependent layer. v1 uses Claude Sonnet for first launch; the provider interface should be designed so that GPT-4o or Gemini can be swapped in for A/B testing within month 2 based on real correction-log data.

---

## 6. Phased delivery plan

The plan below is a recommendation for engineering scoping. Actual estimates depend on team composition and existing infrastructure.

### Phase 0 — Pre-build (3–4 weeks, no engineering)

- **D2M:** Calibrate feature library cost models against 50 past custom orders. For each premium feature (curve, jaali, cane, fluted glass, cut-paste, etc.), compute average material wastage % and labour rate delta from D2M's actual cutlists. **This is the unglamorous core work and is the single biggest determinant of v1 accuracy.**
- **Procurement:** Audit and structure the Master rate sheet. Identify catalogue vs. non-catalogue finishes. Commit to a rate update SLA.
- **Org alignment:** Name owners for Master DB (Procurement) and Feature Library (D2M). Lock the ownership SLAs.
- **Test set:** Curate 50 labelled documents (30 typical, 20 with premium features, mixed PDFs and raw photos) with manually-verified "correct" extractions. This is the v1 acceptance test.

### Phase 1 — Backend foundation (4 weeks, 2 engineers)

- Master Rate DB with admin UI for Procurement
- Feature Library with handler functions for 10 features, calibrated from Phase 0 data
- BOM engine with 5 archetypes (tall storage, base storage, open frame, floating, wardrobe)
- Costing engine (rate lookup → margins → final quote)
- Test harness running against Phase 0 test set; iterate until 80% accuracy threshold met

### Phase 2 — Extraction layer (4 weeks, 1 engineer + half-time prompt engineer)

- Vision LLM integration with Claude Sonnet
- Structured-output prompt with the extraction schema
- Confidence scoring and source attribution
- Catalogue fuzzy matching
- Consistency check engine
- Logging of every extraction (for correction-log analysis later)

### Phase 3 — Designer UI (4 weeks, 1 frontend engineer + designer)

- Two-pane layout with document preview and structured form
- Confidence badges, source attribution tooltips, warning panels
- Premium features panel with live pricing
- Sticky footer with real-time quote breakdown
- Customer and internal PDF generation

### Phase 4 — Pilot (3 weeks)

- 10 designers (mixed HL + DC) pilot the tool on real custom orders
- All pilot quotes also costed by central team in parallel for accuracy validation
- D2M reviews every quote for rule corrections
- Iterate on UX based on observation, not survey

### Phase 5 — Launch (rolling)

- Train trainers in each brand region
- Roll out by region in 2-week waves
- Monitor adoption, accuracy, revenue mix weekly

**Total elapsed time: ~16–20 weeks from kickoff to general availability.**

---

## 7. Success metrics and instrumentation

The product is successful if, six months post-launch:

| Metric | Today | 6-month target | Instrumentation |
|---|---|---|---|
| Custom quote turnaround | 3–4 days | <1 day median, <1 hour at-the-table for typical cases | Quote timestamp from upload to PDF generation |
| Custom revenue mix | ~5% | 7%+ | Revenue dashboard with custom vs. catalogue tagging |
| Quote accuracy (vs. actual billed) | Manual baseline | 90% within ±10% | D2M reconciliation report quarterly |
| Designer adoption | N/A | 80% of eligible custom orders | Quote source tracking in CRM |
| Master rate freshness | Drifted | Updated weekly minimum | DB audit log |
| Feature library coverage | N/A | 95% of detected features have cost models | Feature library hit/miss telemetry |

If revenue mix is not moving despite adoption and accuracy targets being met, the conclusion is that the tool is making designers faster at quoting features they already wanted to quote, but is not actually expanding the set of features designers suggest. This signals UX/upsell-flow issues, not engine issues.

---

## 8. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Procurement does not maintain Master DB | Medium | Severe (tool decays) | Named owner with documented SLA. Monthly Procurement-Engineering check-in. Stale-rate alert on quotes. |
| D2M does not maintain Feature Library | Medium | Severe (tool decays) | Same — named owner, monthly review, feature-library age metric on dashboard. |
| Extraction accuracy below 80% pre-correction | Medium | Moderate | AI-proposes-designer-confirms architecture absorbs this. Correction log feeds v2 improvements. UI is usable even if extraction is poor. |
| Designers don't trust the tool | Medium | High | Calibration phase with 50 past orders showing tool-vs-actual within ±10%. Pilot with 10 designers before launch. Visible confidence buffers, not hidden margins. |
| HomeLane documents are unstructured and fail extraction more than DC | High | Moderate | Operational push for HomeLane to adopt DC-style Details form. Lower extraction-accuracy threshold for HL in v1; improve via correction-log learning. |
| Edge-case shapes (curved bar counters, truly novel geometry) don't fit any archetype | Medium | Low | "Custom panelling" escape hatch in archetype list. Designer can fall back to manual costing for these orders. |
| Calibration shortcut — feature library uses guesses instead of D2M data | High | Severe | Phase 0 is gated. No launch until 50 past orders calibrated. Treat as non-negotiable. |
| Vision LLM cost spikes at scale | Low | Low | Cache aggressively (hash-based dedup). At 500 quotes/month, vision API cost is ~₹15-50k/month — trivial. |

---

## 9. Open questions for engineering review

Before implementation begins:

1. Will the Master Rate DB admin UI for Procurement be a standalone admin app, or part of the designer-facing app with role-gated routes?
2. Can extraction logging include enough document context (file hash + page references) to allow v2 model retraining on real failures without violating customer privacy?
3. What is the org's policy on storing customer documents at rest beyond quote completion? (Retention period, deletion triggers.)
4. Does the existing CRM/quotation system have an API for v2 integration, or will it stay manual-handoff in v2 too?
5. For multi-unit projects (one customer, 5+ custom units), what is the natural unit of work — one quote per unit, or one project quote with 5 line items? v1 assumes the former; v2 may revisit.

---

## 10. Appendix: glossary

| Term | Definition |
|---|---|
| **Archetype** | A structural template (tall storage, base storage, open shelving, floating unit, wardrobe) whose panel geometry derives parametrically from L×H×D and component counts |
| **Feature** | A premium element layered onto an archetype (curve, jaali, cane finish, fluted glass, etc.) with its own cost model in the Feature Library |
| **Feature Library** | D2M-owned set of cost models for each premium feature |
| **Master Rate DB** | Procurement-owned single source of truth for all material, finish, hardware, labour, and overhead rates |
| **Confidence buffer** | Asymmetric pricing buffer per feature based on calibration quality |
| **BOM** | Bill of Materials — structured list of line items (material qty, hardware, labour) for one unit |
| **SKU** | Stock-keeping unit — canonical identifier for a catalogue item |
| **Expo** | Exposed/visible side of a furniture unit that needs a finish treatment (vs. carcass-only sides) |
| **D2M** | Design-to-Manufacturing — team that translates design into cutlists and BOMs for production |
| **SF / DSL** | Standard finish types — SF (Soft Finish), DSL (Designer Series Laminate) |
| **PU / Duco** | Spray-applied finishes — PU (Polyurethane), Duco (lacquer) |
| **Jaali** | Latticed/perforated decorative panel, often MDF + paint |
| **Skirting** | Bottom decorative panel/strip at floor level |
| **Loft** | Top compartment of a wardrobe, often above the main body |
