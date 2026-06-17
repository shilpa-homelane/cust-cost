# User Journey & Requirements

**Custom Costing Tool — Product Requirements Document**
*Captured via stakeholder interview, June 2026*

---

## 1. Overview

This tool is a **quick-estimate calculator** for custom furniture designers. It allows a designer to assemble a bill of materials (BOM), generate a price quote, and share a ballpark estimate with a customer — all within a single session, primarily on a mobile phone.

The AI-assisted image/document extraction is a **convenience shortcut** layered on top of the core calculator. The product must be fully usable without it.

---

## 2. User Personas

### 2.1 Designer
- Internal staff who interact directly with customers.
- Primary user of the app's quoting workflow.
- Uses the app on their **personal mobile phone** — in the showroom or on-site at a customer's home or workshop.
- May also use it on a desktop/tablet.
- Does **not** need access to saved quotes after a session ends.

### 2.2 Tech Admin
- Manages technical configuration of the app.
- Responsible for:
  - Uploading / syncing the master data catalog (materials, prices, units) from source systems.
  - Managing AI/extraction integration settings.
  - Managing user accounts.
- Likely uses a desktop browser.

### 2.3 Business Admin
- Manages business configuration and policy settings of the app.
- Responsible for:
  - Configuring visibility policies (itemized BOM, margin, disclaimer — see §5).
  - Consuming analytics and business insights generated from saved quotes (future iteration).
- Likely uses a desktop browser.

---

## 3. Designer Journey (Primary Flow)

### Step 1 — Receive Customer Input
- The customer shares a design file (PDF or photo of a sketch) with the designer via WhatsApp or similar.
- This is the trigger for the designer to open the app.

### Step 2 — Start a New Quote
- The designer opens the app and starts a new quote session.
- **Option A (AI-assisted):** The designer uploads the customer's image or PDF. The system:
  1. Generates a natural-language description of the furniture piece shown.
  2. Extracts a suggested flat list of materials with quantities (the BOM draft).
- **Option B (Manual / Calculator mode):** The designer skips upload and builds the BOM directly from scratch.
- Both paths lead to the same BOM editing screen.

### Step 3 — Review and Edit the BOM
- The designer sees a flat list of up to ~10 material line items.
- Each line item has the following fields:
  - **Name** — dropdown, constrained to master data catalog.
  - **Unit** — dropdown (e.g. sheets, sq. ft., kg), constrained to master data.
  - **Quantity** — numeric input; must be positive; not free text.
  - **Price per Unit** — pulled from master data based on selected material; may be editable depending on policy.
- The designer can:
  - Add new line items.
  - Remove existing line items.
  - Change any field on any line item.
- All fields in the AI-generated draft are fully editable — the AI output is a starting point, not a locked input.

### Step 4 — Generate the Quote
- Once satisfied with the BOM, the designer requests the system to generate a price quote.
- The system uses the master data catalog to price each line item and produces:
  - **Customer Quote:** Total price (primary), itemized BOM (secondary, visibility policy-controlled).
  - **Internal Cost Sheet:** Internal costs and margin (strictly confidential, never visible to customer).

### Step 5 — Review the Quote (Designer View)
- The designer sees the generated quote on screen.
- Depending on Business Admin configuration and the designer's own discretion:
  - The itemized BOM may be shown or hidden.
  - The internal cost / margin figure is **never displayed on screen by default**; access is configuration-controlled and never visible to the customer.
- The designer decides whether to show the itemized BOM to this specific customer (override within the bounds of policy).

### Step 6 — Share the Quote with the Customer
- **In-person (showroom / on-site):** The designer holds the phone and turns the screen to face the customer, or hands the phone to the customer to scroll through.
  - The screen must be safe to hand over: no internal costing or margin must be visible anywhere on the screen at this moment.
- **Remote:** The designer takes a screenshot of the app and sends it via WhatsApp or email.
- A **disclaimer message** is always visible at the bottom of the quote screen (and therefore captured in any screenshot). Example intent: *"This estimate does not constitute a promise or commitment of any kind and has no legal validity."* The exact text is configurable by the Business Admin.

### Step 7 — Quote is Saved
- Every generated quote is automatically saved to the system for analytics purposes.
- The designer does **not** need to view, search, or manage saved quotes. Saved quotes are analytics data only.

---

## 4. Tech Admin Journey

### Step 1 — Master Data Management
- Upload or sync the materials catalog from the authoritative source system.
- Catalog includes: material names, units, and prices per unit.
- Syncing may be manual (file upload) or automated (integration).

### Step 2 — AI/Extraction Configuration
- Configure the AI provider used for image/document extraction.
- Manage API keys, fallback behavior, etc.

### Step 3 — User Account Management
- Create, update, and deactivate user accounts for Designers and Business Admins.

---

## 5. Business Admin Journey

### Step 1 — Visibility Policy Configuration
The Business Admin controls the following toggles/settings:

| Setting | Description |
|---|---|
| Show itemized BOM to customer | Whether designers are permitted to show the BOM breakdown to customers at all |
| Designer margin access | Whether the internal cost/margin figure is accessible to designers (never visible by default; access is behind a deliberate action) |
| Disclaimer text | The legal disclaimer shown at the bottom of every quote screen |

### Step 2 — Analytics (Future Iteration)
- Business insights from saved quotes (demand patterns, popular materials, pricing trends).
- Not in scope for current build.

---

## 6. Information Visibility Matrix

| Information | Customer | Designer | Business Admin | Tech Admin |
|---|---|---|---|---|
| Furniture description | ✅ | ✅ | ✅ | ✅ |
| Itemized BOM | Policy + designer discretion | ✅ | ✅ | ✅ |
| Total quote price | ✅ | ✅ | ✅ | ✅ |
| Internal cost / margin | ❌ Never | Config-controlled, never on-screen by default | ✅ | ✅ |
| Disclaimer | ✅ (always visible) | ✅ | ✅ | ✅ |
| Saved quotes / history | ❌ | ❌ | ✅ (analytics) | ✅ |

---

## 7. Mobile Design Requirements

- The app must be **fully functional on a mobile phone** (primary form factor for Designers).
- The quote screen must be **safe to hand to a customer** — no confidential data visible.
- Content that overflows the screen must be **scrollable** (customer may scroll when holding the phone).
- The disclaimer must be **visible without scrolling** on the quote screen, or clearly reachable by a short scroll — it must always appear in a screenshot.
- Touch targets must be large enough for use in a showroom environment (possibly one-handed, potentially bright lighting).
- Dropdowns must be mobile-friendly (native select or custom touch-optimized picker).

---

## 8. Out of Scope (Current Iteration)

- Customer-facing portal or login.
- Official quote generation with legal standing.
- Business Admin analytics dashboard.
- Quote revision history accessible to designers.
- WhatsApp or email integration (sharing is manual screenshot/screen-show).
