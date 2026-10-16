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
- Preserve source provenance using the existing behavior, including its
  maximum of three sources, and retain the current conservative,
  per-file-monotonic analysis model.
- Add analyzer coverage for taint on the left and right of every operator,
  plus clean-operand controls. Add a CLI regression that checks exit code 1
  and the exact expected client-boundary finding properties for the fixture.
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
  findings (both sides for all eleven operators) and one nested derived-prop
  finding. Clean controls remained silent.
