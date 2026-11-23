# Element Index Taint

## Problem

An element read such as `labels[process.env.INTERNAL_VALUE]` can reveal
sensitive information even when every value in `labels` is public. Previously,
only the base expression was evaluated for taint, so the selected result could
cross a client boundary, reach an external sink, or be exported undetected.

## Behavior

- Element reads retain sensitive provenance from either the base expression or
  the index expression, including optional element reads (`labels?.[choice]`).
- Keep existing tracked-access and base-expression precedence. If neither is
  tainted, evaluate the index using the existing recursive evaluator and depth
  limit; reuse existing source reasons rather than creating a new rule.
- Stored, assigned, wrapped, nested, template-interpolated, and repeatedly
  indexed results retain provenance. Object and array reads are both covered.
- Existing client-boundary, external-sink, and server-export rules consume the
  result. Detection must not depend on sensitive identifier/member names.
- Reads with public bases and public indices stay clean. A sensitive value in
  a discarded comma operand or a `void` operand does not taint the index result.

## Non-goals

No constant folding, key resolution, runtime validity checks, type-aware lookup,
statement-level implicit-flow tracking, write-target modeling changes, new
configuration, or dependency changes. As with other expression propagation,
optional access is conservative; it does not prove the base is non-nullish.

## Acceptance

The `element-index-taint` fixture reports exactly ten client-boundary findings,
one external-sink finding, and one server-export finding, all with `process.env`
provenance. Public object/array/optional reads and discarded/void index controls
produce no findings. The built CLI emits these twelve findings as JSON and exits
with code 1. Existing tests and lint remain green.
