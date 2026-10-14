# Assignment-operator taint propagation

## Status

Implemented and locally verified in the 2026-10-14 assignment-taint milestone. Verification results are recorded in the [milestone record](../milestones/2026-10-14-assignment-taint.md).

## Behavior

The analyzer propagates the right-hand-side (RHS) taint of `&&=` and `||=` to assignment targets in the same way it does for `=` and `??=`. Supported targets are identifiers, property accesses, and element accesses. `+=` also propagates to element-access targets, in addition to its existing assignment-target support.

Assignment expressions themselves produce taint:

- `=` evaluates as the RHS only.
- `+=`, `??=`, `&&=`, and `||=` conservatively inspect the left operand and then the right operand, like the corresponding existing `+`, `??`, `&&`, and `||` expression behavior.

This covers both subsequent reads of assigned values and uses of the assignment expression's result, including neutral-name cases where taint must come from the source expression rather than a sensitive identifier name.

## Analysis model and boundaries

This extends the existing per-file monotonic fixpoint analysis; it does not add control-flow feasibility or remove taint after a clean overwrite. Element-access tracking uses exact-text indexed keys. Alias tracking and additional destructuring-assignment behavior are out of scope, as are cross-module type-aware dataflow and broader control-flow analysis.

## Regression coverage

The `test/fixtures/assignment-taint/` fixture uses neutral names to exercise assignment-target propagation and assignment-expression results. Analyzer and CLI regression tests cover the fixture. The CLI scan produced nine boundary findings while the clean RHS assignment-expression case and sibling index remained clean; see [the milestone record](../milestones/2026-10-14-assignment-taint.md) for full verification results.
