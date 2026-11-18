# Tagged-template callee taint

## Scope

Close the gap between ordinary calls and tagged templates: sensitive tag
functions now taint template results, including templates without substitutions.

- Specification: [tagged-template-callee-taint.md](../specs/tagged-template-callee-taint.md)
- Regression fixture: `test/fixtures/tagged-callee/`
- Covers server imports, local sensitive-returning functions, member/element
  tags, stored/nested results, and external sinks.
- Preserves configured-source and interpolation handling and public/discarded
  result controls. No new dependencies, rules, or configuration.

## Verification

- Before the fix, the regression failed: only two of nine expected
  client-boundary findings were reported.
- `npm test`: passed (45/45, including build and test compilation).
- `npm run lint`: passed.
- `git diff --check`: passed.
- Built CLI: nine client-boundary findings and one external-sink finding
  (exit code 1, as expected for detected findings).
