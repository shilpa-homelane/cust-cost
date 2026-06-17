# Target Outcomes & Experience: Custom Costing

**Scope of this document:** This describes *what the end state should look and feel like* — the outcomes, the experience qualities, and the changes in behaviour we expect to see. It deliberately contains **no solution** — no architecture, no tooling, no technology, no implementation. It says what "good" looks like, not how to build it.

**Companion document:** `problem_statement.md` (the problem this serves).

---

## 1. The headline outcome

A designer, sitting across from a customer, can turn the design they already have into a **price they trust — in minutes, not days, without leaving the table.**

Everything below is a more precise statement of that one sentence. If the headline is true and the revenue mix moves, the problem is solved. If the headline is true but the revenue mix does not move, the wrong thing was built.

---

## 2. The primary experience (the designer)

Described as outcomes the designer experiences, not screens or steps:

- **They bring what they already have.** Whatever documentation the designer already produces is enough to start. They are never asked to redraw, re-measure, or learn a new way of designing.
- **They get to a number fast.** Within minutes they have a customer-ready price — fast enough that the conversation never has to pause and resume days later.
- **They stay in control.** The designer is never handed a black-box number. They receive a **human-readable summary** explaining exactly what assumptions the AI made. They can see what was understood about the unit, confirm it, and correct anything that's wrong before they rely on the price. The final quote is something they *vouch for*, not something they merely receive.
- **They can see where it's unsure.** When the design is ambiguous or under-documented, that uncertainty is visible — not hidden behind a confident-looking number. The system strictly prefers `null` over guessing, ensuring the designer knows which parts to double-check.
- **They are nudged to sell more.** Premium features are surfaced as opportunities, each with its incremental price visible, so the designer can say "for this much more, you can have the curve / the fluted glass / the cane finish." Over time, designers learn what is profitable and become *more willing* to suggest custom — this is the behaviour the whole effort exists to create.
- **They are told when to stop or upload better documents.** If the uploaded image is a mood board or Pinterest inspiration photo (reference image only), or if the unit is genuinely novel and doesn't resemble anything the tool can price confidently, the designer is told so honestly and routed to the existing manual path — never given a fabricated number that looks trustworthy but isn't.
- **They walk away with two things:** a **clean, customer-facing quote** (branded, with the price and what it covers — no internal cost or margin detail), and an **internal breakdown** that shows how the number was reached for anyone who needs to audit it.

---

## 3. The qualities the outcome must have

These are the non-negotiable characteristics of "good," independent of how it's delivered:

1. **Fast** — minutes, at the table. Speed is the whole point of moment-of-intent selling.
2. **Trustworthy** — close enough to reality (≈90% of orders within ±10% of final billed) that designers and the business rely on it without a parallel manual check.
3. **Conservative when unsure** — when the inputs are ambiguous, the price leans slightly high rather than slightly low. Designers can trust that the tool won't quietly under-quote and cost the business margin.
4. **Transparent inside, clean outside** — fully explainable internally (every part of the number can be traced and audited), and clean externally (the customer sees a price and what it buys, never the internal cost structure).
5. **Designer-in-control** — the human confirms before the number is trusted. The experience proposes; the designer decides.
6. **Upsell-surfacing** — premium features are presented as priced opportunities, not buried. The default experience should *expand* what designers feel comfortable suggesting.
7. **Honest about its limits** — it declines gracefully on units it cannot price confidently rather than guessing.
8. **Consistent** — one current, shared source of truth for rates and feature costs. No diverging copies, no stale numbers, no "which version did you use?"

---

## 4. Outcomes for the other stakeholders

- **D2M (Design-to-Manufacturing):** Their hard-won knowledge of what premium features actually cost stops living in their heads and individual files, and becomes something maintained, reusable, and improving over time. Their time shifts away from re-deriving quotes toward owning and refining that knowledge. They can audit any quote and see exactly how it was built.
- **Procurement:** Rates become a single source of truth they own and keep current, instead of drifting across spreadsheet copies. Updating a rate is routine and immediate, with no engineering involvement.
- **Senior designers / managers:** Where approval is needed above a value threshold, they can see the basis of a quote quickly and sign off with confidence.
- **Leadership:** Can watch the custom revenue mix move, with quote turnaround, accuracy, and adoption all visible — and can tell whether the investment is producing the revenue growth it was justified on.

---

## 5. The change in the world (behavioural end state)

Six months after this is working, these things are true that were not true before:

- Custom quote turnaround has collapsed from **3–4 days to minutes** for typical cases.
- Designers **suggest custom features more often**, because the friction that made them avoid it is gone.
- The **custom revenue mix is rising** — the real measure of success.
- Feature-cost knowledge is **institutional**, not tribal — it survives people leaving and improves with each calibration.
- Rates are **current and trusted**, not drifting.
- The central costing team is **no longer the bottleneck** for routine custom orders, freeing them for the genuinely hard cases and for maintaining the knowledge base.

---

## 6. What "good" looks like (target metrics)

| Dimension | Today | Target end state |
|---|---|---|
| Quote turnaround | 3–4 days | Minutes at the table for typical cases; under a day otherwise |
| Custom revenue mix | ~5% | 7–8%+ |
| Quote accuracy | Manual, varies | ~90% of completed orders within ±10% of final billed |
| Designer adoption | N/A | The large majority of eligible custom orders quoted this way |
| Rate freshness | Drifted across copies | One source of truth, kept current |
| Feature-cost knowledge | In people's heads | Owned, maintained, and improving |
| Designer behaviour | Avoid suggesting custom | Confidently suggest custom, with incremental price visible |

**The decisive metric is revenue mix.** Turnaround, accuracy, and adoption can all hit target while the mix stays flat — and if that happens, it means the experience made designers *faster at quoting what they already would have quoted*, but did not make them *suggest more*. That is the signal to fix the upsell experience, not the engine.

---

## 7. Anti-goals — what the end state must NOT become

Guardrails against drifting away from the intended outcome:

- **Not a black box.** A number the designer can't see into and can't correct is a failure, even if accurate.
- **Not a false-confidence machine.** Producing a clean, confident quote for a unit it cannot actually price is worse than declining.
- **Not "merely faster."** If it speeds up quoting without expanding what designers suggest, it has solved the wrong problem.
- **Not a tool that leaks margins to customers.** The customer-facing output never exposes internal cost structure.
- **Not something that demands new designer habits.** If it requires designers to change how they design or document, adoption fails.
- **Not a system that silently rots.** If feature costs and rates aren't owned and kept current, accuracy decays — and a decayed tool is worse than none, because people trust it.

---

## 8. The one-line test

> Can a designer, with the customer still in front of them, turn the design they already have into a price they'd stake their name on — and feel encouraged to suggest the curve, the fluted glass, the cane finish — because the price for it is right there?

When that is routinely true across both brands, and the custom revenue mix is climbing, the outcome has been achieved.
