# Comma-expression taint propagation

Implemented and locally verified.

## Behavior

- A comma expression `(left, right)` derives its result taint only from `right`, matching JavaScript's result-value semantics.
- Nested comma expressions recurse through their final operand. Sensitive values in discarded operands alone do not taint the result.
- The normal AST traversal still visits both operands. Assignments in earlier operands retain their existing monotonic taint effects on their targets.
- The result rule applies wherever expression taint is consumed, including initializers, client-component props, and external sinks.
- Existing plain-assignment behavior is unchanged: its result also uses only the RHS.

## Acceptance and verification

`test/fixtures/comma-taint/` exercises sensitive final operands, nested sequences, discarded sensitive values, clean sequences, and an earlier assignment followed by a clean final value. Sensitive-name heuristics are disabled in analyzer tests so propagation is tested independently.

- Analyzer tests require exactly four client-boundary findings and one external-sink finding, with environment-source provenance retained.
- CLI regression requires exit code `1` and exactly five findings.
- `npm test`: 41/41 passing, including build and four new regression tests.

## Limits

No control-flow feasibility or alias tracking is added. Earlier assignments remain subject to the existing per-file, monotonic fixpoint: clean overwrites do not clear taint. This milestone does not add general implicit-flow analysis or other binary operators.
