# Destructuring-assignment taint propagation

## Status

Implemented and locally verified in the [2026-11-04 milestone](../milestones/2026-11-04-destructuring-assignment-taint.md).

## Behavior

Destructuring assignments propagate taint from the RHS to their destination reads.
Unlike declaration binding patterns, TypeScript represents assignment patterns as
object and array literal expressions.

Supported patterns include:

- Object properties, renamed targets, and shorthand properties.
- Array elements and holes.
- Nested object and array patterns.
- Object and array rest targets.
- Identifier, property-access, and element-access destinations.
- Defaults, including shorthand object defaults and nested pattern defaults.
  Taint from either the incoming source or the default is retained.
- Statically named sensitive object members, including identifier and string-literal
  keys, even when the RHS has no known taint.

Only destinations are marked: property keys and array holes are not assignment
targets. Clean destinations and unrelated tracked properties or indices remain
clean unless another source taints them.

## Analysis model and limits

This uses the existing monotonic per-file fixpoint. A tainted RHS conservatively
taints every destination; individual RHS members and indices are not projected
onto individual targets. Defaults are considered regardless of runtime feasibility.
Clean overwrites do not remove taint. Indexed destinations retain the analyzer's
exact-text key model.

Alias analysis, computed-key source inference, control-flow feasibility,
cross-module type-aware dataflow, and changes to destructuring declarations,
parameters, or loop binding semantics are out of scope.

## Regression coverage

The neutral-name fixture in `test/fixtures/destructuring-assignment/` covers each
supported pattern, sensitive-member reads, a tainted source with a clean default,
and clean RHS/default/property/index controls. Analyzer tests assert exact finding
locations, and a built-CLI test checks JSON findings and exit status.

The provenance regression fixture additionally disables sensitive-name heuristics
and checks twelve environment-derived boundary findings, including nested defaults,
object rest, and member/index destinations, while retaining clean sibling controls.
