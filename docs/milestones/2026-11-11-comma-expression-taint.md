# Comma-expression result taint

Implemented comma-expression result propagation using the final operand's taint
and existing source reasons. Nested/chained expressions and existing containers,
variables, client props, and external sinks use the same expression evaluator.
Discarded sensitive operands do not taint public results.

- Specification: [comma-expression-taint.md](../specs/comma-expression-taint.md)
- Regression fixture: `test/fixtures/comma-expression/`
- Acceptance: exactly five boundary findings and one external sink, with four
  clean boundary controls and one clean sink control. Name heuristics are
  disabled in the regression to isolate source-based dataflow.
- Scope excludes new rules/options, alias tracking, control-flow analysis,
  cross-module dataflow, and changes to side-effect traversal.

## Verification

- Regression reproduced before the implementation: zero boundary findings
  instead of the expected five.
- `npm test`: passed (42/42, including build and test compilation).
- `npm run lint`: passed.
- `git diff --check`: passed.
- Built CLI: five boundary findings and one external sink, exit code 1;
  public-result controls remain clean.
