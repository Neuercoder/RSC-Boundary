# Destructuring-assignment taint propagation

## Status

Implemented and locally verified in the [2026-10-23 milestone](../milestones/2026-10-23-destructuring-assignment-taint.md).

## Behavior

Plain `=` assignments with object or array patterns propagate taint from the
right-hand side to every assignment target. TypeScript represents these patterns
as object/array literal expressions, not the binding patterns used in declarations.

Supported targets and pattern forms:

- Identifiers, property accesses, and element accesses.
- Renamed and shorthand object properties, nested object/array patterns.
- Array holes (ignored), array rest, and object rest.
- Default initializers, including shorthand defaults (`({ value = fallback } = input)`).
  Taint from the input or fallback reaches the corresponding target, even when
  the other expression is clean. Defaults are conservatively considered without
  checking whether the input could be `undefined`.

For example, `({ value: result } = process.env)` and
`[holder.value] = process.env` make subsequent reads of the respective targets
tainted. `({ result = process.env.VALUE } = {})` also taints `result`.
Clean patterns and clean defaults introduce no new taint by themselves.

## Analysis boundaries

The existing monotonic, per-file fixpoint analysis is unchanged. Whole-source
taint is conservatively copied to every target; this is not field-sensitive
extraction. Clean overwrites do not remove taint. Property and indexed targets
use exact source-text keys, so sibling accesses are not tainted by target writes.

This milestone does not add alias tracking, control-flow feasibility, computed-key
source inference, sensitive-member inference for clean destructured inputs,
destructuring assignment targets in `for...of` / `for...in`, or cross-module
type-aware dataflow. The result of a plain assignment remains its RHS, as defined
by the preceding assignment-taint milestone.

## Regression coverage

The neutral-name `test/fixtures/destructuring-assignment/` fixture exercises source
propagation, nesting, holes, rests, property/index targets, and both default forms.
Analyzer tests check ten expected boundary findings and five clean/sibling reads;
a built-CLI test checks JSON output and exit code 1.
