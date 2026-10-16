# Milestone 2026-10-16 — Arithmetic and Bitwise Operator Taint

- **Status:** Implemented and locally verified
- **Date:** 2026-10-16
- **Spec:** [arithmetic-taint.md](../specs/arithmetic-taint.md)

## Goal

Close the binary-expression taint gap for arithmetic and bitwise operations.
The analyzer already carries taint through `+` and logical operators, but
currently loses it when a tainted value participates in `-`, `*`, `/`, `%`,
`**`, `<<`, `>>`, `>>>`, `&`, `|`, or `^`. An expression derived from either
operand must remain tainted when it reaches an existing finding boundary.

## Scope

- Extend binary-expression taint evaluation to combine both operands for the
  eleven operators in the spec. Either operand can contribute taint; two
  clean operands remain clean.
- Evaluate the left operand first. If it is tainted, return its reasons capped
  at three without inspecting the right operand; otherwise inspect and return
  the right operand's reasons. Retain the current conservative,
  per-file-monotonic analysis model.
- Add analyzer coverage for taint on the left and right of every operator,
  plus clean-operand controls; analyzer assertions check exact prop names and
  the environment source. Add a CLI regression that checks exit code 1,
  finding count, and clean silence.
- Keep this change limited to expression evaluation, its regression fixture
  and tests, and these docs; no new rules or boundary types.

## Out of scope

- Compound-assignment writes or other assignment behavior.
- Control-flow feasibility, comparisons, cross-module analysis, or
  sanitization.
- Clearing previously observed taint: analysis remains monotonic, so a clean
  path or later clean assignment does not retract taint.

## Verification

- `npm test` — 40/40 passed. Before the fix, the three new regressions failed
  and the 37 baseline tests passed.
- `npm run lint` — passed.
- `git diff --check` — passed.
- Built CLI scan exited `1` with exactly 23 findings: 22 operand-side
  findings (both operand positions for all eleven operators) and one nested
  derived-prop finding. The CLI regression checks the count and clean
  controls' silence; exact prop names and environment-source assertions are
  in the analyzer tests.
