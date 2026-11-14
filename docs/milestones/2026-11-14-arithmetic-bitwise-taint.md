# Arithmetic and bitwise expression-result taint

## Scope

Propagate sensitive operand values through binary arithmetic and bitwise
operations using the existing expression evaluator and source reasons.

- Specification: [arithmetic-bitwise-taint.md](../specs/arithmetic-bitwise-taint.md)
- Regression fixture: `test/fixtures/arithmetic-bitwise/`
- Acceptance: exactly 25 boundary findings and one external sink, with
  public-value and discarded-result controls remaining clean.
- No new rules/options, compound assignments, constant folding, comparisons,
  control-flow analysis, or cross-module dataflow.

## Verification

- Regression reproduced before the fix: zero boundary findings rather than 25;
  all 42 existing tests passed.
- `npm test`: passed (43/43, including build and test compilation).
- `npm run lint`: passed.
- `git diff --check`: passed.
- Built CLI: exactly 25 boundary findings and one external sink, exit code 1.
- Environment-source provenance is asserted with sensitive-name and member
  heuristics disabled; public and discarded-result controls stay clean.
