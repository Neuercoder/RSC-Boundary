# Destructuring-assignment taint propagation

## Status

Implemented and locally verified in the [2026-10-29 milestone](../milestones/2026-10-29-destructuring-assignment.md).

## Behavior

Plain assignment patterns use expression AST nodes, unlike declaration binding
patterns. The analyzer must propagate taint through object and array assignment
patterns, including:

- Renamed and shorthand object entries, nested patterns, and object rest.
- Array entries, omitted entries, nested patterns, and array rest.
- Identifier, property-access, and element-access assignment targets.
- Default initializers, including shorthand defaults and nested patterns with
  defaults. Inherited RHS taint and initializer taint both reach the target;
  a default's taint does not spread to its sibling targets.
- Static sensitive object-member keys (identifier or string-literal keys),
  even when the RHS is not otherwise tainted, honoring configured member patterns.

An assignment expression still evaluates to its RHS for taint purposes. Clean
RHS values and defaults do not clear previously tracked taint. Existing exact-text
property/index tracking remains unchanged; assigning to one indexed target must
not taint its sibling index.

## Analysis boundaries

This extends plain `=` assignment handling within the existing monotonic,
per-file fixpoint model. A tainted aggregate RHS conservatively taints every
selected target; there is no field-sensitive extraction or control-flow/default
feasibility analysis. Computed sensitive keys are not classified as static member
sources. Aliasing, new declaration-binding behavior, destructuring loop targets,
and cross-module type-aware dataflow are outside this milestone.

## Regression coverage

The neutral-name `destructuring-assignment` fixture is exercised through the
analyzer with name/member heuristics disabled, with default configuration, and
through the CLI scan API. Exact boundary-prop sets verify both leaks and clean
siblings. Build, full tests, lint, diff checks, and a real CLI JSON scan are
required before publication.
