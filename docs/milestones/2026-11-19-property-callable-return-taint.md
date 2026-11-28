# Function-valued object-property return taint

## Scope

Extend object-callable return analysis to arrow and function-expression properties.

- Specification: [property-callable-return-taint.md](../specs/property-callable-return-taint.md)
- Regression fixture: `test/fixtures/property-callable/`
- Covers concise/block/async arrows, ordinary functions, parenthesized functions,
  nested and inline objects, member/element calls, stored results, callable props,
  external sinks, and server exports.
- Keeps public returns, discarded values, and uncalled nested functions clean.
- Reuses existing return scanning and whole-object propagation; no dependencies
  or configuration changes.

## Verification

- Before the fix, the regression reported zero of ten expected client findings.
- `npm test`: passed (48/48, including build and test compilation).
- `npm run lint`: passed.
- `git diff --check`: passed.
- Built analyzer with identifier/member heuristics disabled: ten client-boundary
  findings, one external-sink finding, and two server-export findings.
