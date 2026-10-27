# Comma-expression taint propagation

## Status

Implemented and locally verified in the [2026-10-27 milestone](../milestones/2026-10-27-comma-expression-taint.md).

## Behavior

A comma expression evaluates both operands but returns only its final operand.
The analyzer therefore derives the expression's taint and provenance only from
the right-hand side. Nested comma expressions follow the same rule recursively.

- `("public", process.env.API_SECRET)` is tainted.
- `("public", ("public", process.env.API_SECRET))` is tainted.
- `(process.env.API_SECRET, "public")` has a clean result.
- `(value = process.env.API_SECRET, "public")` has a clean result, but
  subsequent reads of `value` remain tainted.

This applies wherever expression taint is inspected, including variable
initializers, client-component props, and external-sink arguments. Normal AST
traversal still processes earlier operands for assignments and sink calls; a
discarded expression result does not discard those effects.

## Boundaries

This is not control-flow or alias analysis. Existing monotonic fixpoint behavior
is unchanged: clean overwrites do not remove taint. Argument-list commas and
array-element separators are not comma operators and retain their existing
behavior.

## Regression coverage

The neutral-name `test/fixtures/comma-taint/` fixture covers direct and nested
expressions, clean final operands, assignment side effects, and external sinks.
Analyzer and CLI tests expect exactly four client-boundary findings and one
external-sink finding, with source provenance preserved.
