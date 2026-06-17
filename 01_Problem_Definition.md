# Problem Definition: Automated Costing for Custom Furniture Orders

**Author:** Product/Strategy
**Stakeholders:** Design, D2M (Design-to-Manufacturing), Procurement, Engineering, Leadership
**Status:** Draft for review
**Date:** May 2026

---

## 1. Executive summary

HomeLane and DesignCafe both offer custom (non-catalogue) furniture units alongside their catalogue ranges. These custom orders today represent approximately **5% of revenue**, are priced at a **premium** over comparable catalogue items, and are explicitly chosen by customers because of features (curves, jaali patterns, fluted glass, asymmetric expo, cane finish, decorative laminate patterns) that the standard catalogue doesn't offer.

Despite the strategic value of this segment, the **costing process for custom orders is slow, manual, and centralised**. A designer who wants to quote a custom unit to a customer must send the design to a central team and wait **3–4 days** for a price. This bottleneck has two consequences:

1. **Lost conversions** — customers cool off, simplify their brief to catalogue items, or shop elsewhere during the wait.
2. **Suppressed upsell** — designers avoid suggesting custom features in the first place because of the quote friction, leaving premium revenue on the table at the conversation stage, not just the conversion stage.

**The opportunity is not operational efficiency. It is revenue mix growth.** A tool that reduces custom-order quote turnaround from days to minutes, at the designer's table, with acceptable accuracy, can plausibly grow the custom revenue mix from **5% to 8%+** — a substantial commercial outcome that dwarfs the time savings.

This document defines the problem, the current state, the strategic framing, the constraints, and the criteria for a successful solution. It is the input for a separate Product Requirements Document.

---

## 2. The problem in detail

### 2.1 What "custom" means at HomeLane and DesignCafe

Custom orders fall into two broad cases:

1. **Variants of catalogue archetypes** — a wardrobe but 2100mm wide instead of 2000mm, a vanity with non-standard depth, a foyer tall in dimensions the catalogue doesn't offer. The structural math is well understood; only the numbers differ.
2. **Genuinely bespoke premium features** — curves, jaali backs, fluted glass shutters, asymmetric expo treatments, cane finish insets, decorative laminate cut-and-paste patterns, arch cutouts, custom floating units. These features are *the reason* customers choose custom and are charged at a premium.

Both cases go through the same manual costing process today, but the second case is the commercially important one.

### 2.2 The current costing process

When a customer asks for a custom unit, the workflow is:

1. Designer captures customer brief — typically a SketchUp/Foyr 3D render plus measured drawings plus a finishes selection. In DesignCafe's case, designers fill a structured "Details" form (dimensions, shutter type, finishes, expo, handle SKU, reason for custom). HomeLane's documentation is less standardised — typically annotated SketchUp elevations with dimension callouts and a finishes page.
2. Designer compiles the documentation into a PDF, or takes a raw photo of a sketch from a mobile phone.
3. The PDF or raw photo is sent to a central costing team.
4. Central team manually:
   - Identifies the archetype (wardrobe / base storage / tall storage / floating / etc.)
   - Computes panel areas from dimensions
   - Identifies finishes and looks up rates in the Master rate sheet
   - Identifies hardware (handles, hinges, channels) and looks up rates
   - Estimates extra material wastage and labour for premium features based on past experience
   - Applies wastage %, labour rates, miscellaneous %, transportation %, vendor margin, brand margin
   - Produces a quote
5. Quote is returned to designer 3–4 days later.
6. Designer presents to customer.

This process exists because the underlying costing logic *is* well-understood — there is a working Excel-based costing tool (`Storage-TOOL.xlsx`) with parametric calculators for at least three archetypes (Storage-Shutter, Storage-Open, Vanity) and a Master rate sheet with ~120 materials, finishes, hardware, and labour items. The bottleneck is that this tool is locked inside a clunky multi-sheet file that only the central team operates, and the Master rates are not maintained in real time by Procurement.

### 2.3 Pain points in the current state

- **Quote turnaround of 3–4 days** suppresses customer conversion at the moment of highest intent (when the customer is at the designer's table).
- **Designers avoid suggesting custom features** because of the friction — premium revenue is lost before the customer ever sees a quote.
- **Master rates are not maintained in real time** by Procurement. The central team's quotes are based on rate snapshots that drift from current procurement reality, creating margin risk on both sides (under-quoting eats margin; over-quoting loses deals).
- **The Excel tool is fragile.** The Vanity tab in the existing file is already broken with `#REF!` errors. Designers who get a copy end up with their own versions, and Master rates drift between copies.
- **No structured capture of design intent.** HomeLane documentation is inconsistent — some have measured drawings in PDFs, some have raw photos of paper sketches, some have inspiration images, some have ambiguous depth notations (e.g. "380+20") that require interpretation. The central team spends time parsing rather than pricing.
- **No institutional memory for feature costs.** Curve wastage, jaali labour, cut-paste pattern overhead — D2M (Design-to-Manufacturing) knows these numbers from past projects, but they live in heads and individual project files. New analysts re-derive them. Past projects are not systematically used to calibrate future quotes.

### 2.4 What "custom" looks like — example documents reviewed

The following four documents from past projects were reviewed during problem definition:

| Document | Brand | Description | Documentation quality |
|---|---|---|---|
| Crockery Unit FF - Wall Unit | HomeLane | Wall-mounted 1000×1600mm crockery upper with 4 fluted-glass shutters in PU Gloss RAL 9001. Premium features: fluted glass. | SketchUp elevation + internal + finishes page. Carcass material not stated. |
| MBR 1 FF (Master Bedroom Wardrobe) | HomeLane | 2460×2100mm six-shutter wardrobe with loft, cane-finish inset panels on shutters, 25mm thick shutters, PU Matt RAL 9010 finish. Premium features: cane finish, non-standard 25mm shutters. | SketchUp elevation + internal + finishes page. Some annotations contradict (text says "CLEAR GLASS" but visible is cane). Width derived by summing shutter callouts; no overall-width annotation. |
| DC Titas Foyer (5 custom units in one PDF) | DesignCafe | Multiple units including a 470×2000×380+20mm foyer tall with R218 curved corner, dual-finish Beige SF + Cana Walnut SF cut-and-paste pattern, asymmetric right-side expo. Premium features: curve, cut-paste laminate, asymmetric expo. | Structured Details form per unit (dimensions, finishes, expo, handles all labelled) + dimensioned drawing + reference image + finishes page. Best-documented format. |
| Mr Debarshi TV Unit | Unknown brand | Twin floating drawer console, 600mm × 200mm each box, 100mm curved profile on top panel and drawer fronts, 430+20mm drawer depth differing from 450mm top panel depth, asymmetric left+right expo in Lam Peach SF, PH_D10 handle in Satin Black. Premium features: curves, asymmetric expo, floating mount. | Minimal SketchUp screenshot with text annotations off to the side. Overall assembly length not dimensioned; brand not identifiable from doc. |

These four span the realistic input quality spectrum. A successful solution must handle all four, with the understanding that input quality directly determines extraction accuracy.

---

## 3. Strategic framing

### 3.1 The real opportunity

The framing that initially appears correct — *"automate manual costing to save time"* — is the wrong frame. It positions the project as operational efficiency, which typically funds a small internal tool with modest payback.

The correct framing is **growing the custom revenue mix**. The friction in the current process suppresses both conversion (customers cool off) and upsell (designers don't suggest features). A tool that removes this friction can plausibly grow custom from 5% to 8% of revenue. On a meaningful revenue base, that delta dwarfs the operational savings.

This re-framing matters for:

- **Funding and prioritisation** — leadership signs off on revenue growth tools more readily than internal efficiency tools.
- **Product design choices** — the tool must make designers *more willing* to suggest custom features, not just faster at quoting requested ones. The UX must surface premium features as upsell prompts, with incremental price visible, so designers learn what's profitable.
- **Accuracy posture** — under-quoting is much worse than over-quoting. Under means margin loss on deals already booked; over means losing deals you'd have lost anyway if they were too price-sensitive. The tool should apply asymmetric confidence buffers per feature.

### 3.2 What this is and what this is not

| This project IS | This project IS NOT |
|---|---|
| A self-service costing tool for designers, deployed at point of sale | An AI-powered drawing reader that replaces D2M |
| A way to make Procurement own the Master rates in real time | A replacement for D2M's cutlist and BOM work for production |
| A way to codify D2M's tribal knowledge about feature costs into a maintainable library | A way to automate D2M's job |
| An assistant that helps designers upsell custom features | A customer-facing self-serve quote tool (deferred to v2) |
| A standalone web tool for v1 | An integration with CRM/CAD/quotation systems (deferred to v2) |

### 3.3 Why now

Three things have become true that make this buildable in 2026 in a way it wasn't earlier:

1. **Vision-capable LLMs are now reliable enough** to read structured design PDFs and raw mobile phone photos to extract dimensions, finishes, and features with confidence scoring — *good enough for a human-in-the-loop architecture*. They are not yet good enough for full automation, but the AI-proposes-designer-confirms pattern is the right architecture and is achievable today.
2. **DesignCafe has already moved toward structured documentation** with the "Details" form on page 1 of each custom unit. This format is nearly trivially parseable. HomeLane has not yet adopted similar standardisation; doing so is an operational lever that compounds the technical lever.
3. **The underlying costing logic already exists** in `Storage-TOOL.xlsx`. The problem is not figuring out how to cost — it is generalising, structuring, and putting that logic behind a usable interface.

---

## 4. Constraints and assumptions

### 4.1 Constraints

- **Accuracy target: ~90%** of completed orders within ±10% of the tool's quote, measured against the final billed amount.
- **Speed target: under 5 minutes** from document upload to handable customer quote.
- **Under-quoting is materially worse than over-quoting** — accuracy is asymmetric.
- **Designers cannot be required to learn new design tools.** The tool must work with the documentation designers already produce (PDFs from SketchUp, or raw photos of sketches, with whatever level of annotation they happen to include).
- **Custom orders are roughly 5% of revenue today** and the tool needs business-case validation; this is not a high-volume product that can absorb large engineering investment without a clear thesis.

### 4.2 Assumptions

- **Procurement will commit to maintaining the Master rate database in real time.** Without this, the tool will be accurate on day 1 and decay every month after. This is a precondition, not a nice-to-have.
- **D2M will commit to owning the Feature Library.** Pricing the wastage delta on a 100mm curve or the labour delta on a jaali pattern requires manufacturing knowledge that lives in D2M, not Procurement or Design. This is also a precondition.
- **Designers will adopt the tool** if the speed and confidence advantages over the current process are obvious. Adoption is not a default and must be measured.
- **Most custom orders are variants of a small set of archetypes** (5 cover ~95% of cases based on observed documents): tall storage with shutters, base storage with shutters, open shelving/frame, floating unit, wardrobe. Truly novel structural geometries are rare and can use a "custom panelling" escape hatch.

### 4.3 Risks

- **Org-side ownership risk** — if Procurement does not actually maintain Master rates and D2M does not actually maintain the Feature Library, the tool's accuracy decays in 6 months. This is the single biggest failure mode and is not a technical risk.
- **Adoption risk** — designers may not trust the tool early, especially after past experiences with broken Excel files. Need a calibration phase that produces visible "tool agrees with D2M on 50 past quotes" evidence before launch.
- **Edge-case risk** — the genuinely-novel-shape custom orders (curved bar counters, complex floating geometries) may not fit any archetype. Need a graceful escape hatch to manual costing for these, not a tool that pretends to handle them.
- **Calibration risk** — the feature library cost models (curve wastage %, jaali labour rate, etc.) must come from D2M's past project data, not from guesses. Skipping this calibration is a tempting shortcut that will undermine accuracy.

---

## 5. What good looks like

Six months after launch, the tool will be working if:

| Metric | Today | Target |
|---|---|---|
| Custom quote turnaround | 3–4 days | <1 day for most; <1 hour at designer's table for typical cases |
| Custom revenue mix | ~5% | 7%+ |
| Quote accuracy | Manual; D2M dependent | 90% of completed orders within ±10% of tool quote |
| D2M time spent on costing | High | Meaningfully reduced; redirected to cutlist and feature library maintenance |
| Designer adoption | N/A | 80% of eligible custom orders quoted via the tool |
| Master rate freshness | Drifted across copies | Single source of truth, updated by Procurement weekly or more often |

If custom revenue mix is not moving even with high adoption and accuracy, the tool is solving the wrong problem — it is helping designers quote faster but not helping them sell more. That is the signal to look at whether the UX is actually surfacing custom features as upsell prompts, not just confirming what designers already wanted to quote.

---

## 6. Open questions for stakeholders

Before the PRD is finalised, these need explicit answers:

1. **Org ownership** — Who specifically in Procurement owns the Master rate maintenance? Who specifically in D2M owns the Feature Library? Both need named individuals with an explicit SLA.
2. **Calibration sample** — Can we get 50 past custom orders (30 typical + 20 with premium features) along with their *actual billed amounts* to calibrate the tool before launch?
3. **HomeLane documentation standardisation** — Will HomeLane adopt a structured Details form like DesignCafe's? This is the highest-leverage operational decision and is not a tech investment.
4. **Margin authority** — Can designers adjust margins in the tool, or only senior designers? Same for confidence-buffer override.
5. **Approvals and workflow** — Does a designer-generated quote go to the customer directly, or does it route through a regional manager for sign-off above a certain value?
6. **Multi-unit projects** — A real customer order often has 5+ custom units in one project. Does each get a separate quote (v1 approach) or do they get bundled?
7. **CRM/quotation integration** — Is v1 standalone (designer downloads a quote PDF and pastes it elsewhere) or does the tool push to the existing quotation system?

---

## 7. Appendix: definitions

- **Archetype** — a structural template (tall storage, base storage, open shelving, floating unit, wardrobe) whose panel geometry can be derived parametrically from length × height × depth and counts of shutters/shelves/partitions/drawers.
- **Feature** — a premium element layered onto an archetype (curve, jaali, cane finish, fluted glass, asymmetric expo, cut-paste laminate, arch cutout, etc.) with its own cost model in the Feature Library.
- **Feature Library** — the D2M-owned set of cost models (wastage %, labour rate, additional materials) for each premium feature. Encodes tribal knowledge as maintainable rules.
- **Master rate database** — Procurement-owned single source of truth for all material, finish, hardware, and labour rates. Replaces the current Excel Master sheet.
- **Confidence buffer** — an asymmetric pricing buffer applied per feature based on how well-calibrated its cost model is. Well-known features quote tight; experimental features quote with a 5–10% buffer until D2M validates.
- **D2M (Design-to-Manufacturing)** — the team that translates design intent into cutlists and BOMs for production. The only team that has manufacturing knowledge holistically across HomeLane and DesignCafe.
