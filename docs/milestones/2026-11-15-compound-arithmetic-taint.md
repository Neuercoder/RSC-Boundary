# Arithmetic and bitwise compound-assignment taint

## Scope

Complete the arithmetic/bitwise operator family by tracking compound
assignment expression results and updated targets.

- Specification: [compound-arithmetic-taint.md](../specs/compound-arithmetic-taint.md)
- Regression fixture: `test/fixtures/compound-arithmetic/`
- All twelve operators, including existing `+=`, share the same result and
  target propagation handling.
- Acceptance: exactly 39 client-boundary findings and one external sink;
  public and discarded-result controls remain clean.
- No new rules, options, dependencies, or broader dataflow analysis.

## Verification

- The new regression failed before the fix.
- `npm test`: passed (44/44, including build and test compilation).
- `npm run lint`: passed.
- `git diff --check`: passed.
- Built CLI: 39 client-boundary findings and one external sink, exit code 1.
- Regression tests disable sensitive-name/member heuristics and assert
  environment-source evidence on right-operand results and the external sink.
