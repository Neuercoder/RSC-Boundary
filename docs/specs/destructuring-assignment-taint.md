# Destructuring-assignment taint

## Status

Implemented and locally verified in the [2026-10-20 milestone](../milestones/2026-10-20-destructuring-assignment-taint.md).

## Behavior

Assignment patterns use object/array literal AST nodes, not the binding-pattern
nodes used by declarations. Recursively propagate RHS taint through those
assignment targets:

- Object renamed and shorthand properties, including computed property names.
- Array elements and holes, nested object/array patterns, and object/array rest.
- Identifier, property-access, and element-access leaves.
- Defaults, including nested patterns: conservatively combine incoming taint with
  taint from the default expression, even when the incoming RHS is clean.

Keep source reasons attached to assigned leaves. Plain assignment expressions
still evaluate as their RHS, and logical/compound assignment behavior is unchanged.

## Analysis boundaries

This uses the existing per-file monotonic fixpoint. Aggregate RHS taint is applied
to every target in a pattern; this does not add field-sensitive extraction or
model whether a default or rest element is actually used. Clean overwrites do
not clear taint. Indexed targets retain exact-text keys; sibling indices are not
implicitly tainted. Aliases and cross-module type-aware flow remain out of scope.

## Acceptance checks

Neutral-name fixtures with sensitive-name/member heuristics disabled must detect
nested, renamed, rest, default, property and indexed target leaks while preserving
clean controls and a clean sibling index. CLI JSON scanning must report the same
boundary leaks with exit code 1. Existing tests and lint must continue passing.
