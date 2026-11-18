# Object method and getter return taint

## Scope

Detect sensitive return values exposed through object-literal methods and
getters, reusing the existing function-return scanner and whole-object taint
model.

- Specification: [object-callable-return-taint.md](../specs/object-callable-return-taint.md)
- Regression fixture: `test/fixtures/object-callable/`
- Covers ordinary/async methods, getters, nested and inline objects, stored
  results, member/bracket calls, external sinks, and server-module exports.
- Preserves public-return, uncalled nested function/arrow, setter, and
  discarded comma-result controls. No new dependencies or configuration.

## Verification

- Before the fix, the regression reported zero of seven expected
  client-boundary findings.
- `npm test`: passed (46/46, including build and test compilation).
- `npm run lint`: passed.
- `git diff --check`: passed.
- Built CLI: seven client-boundary findings, one external-sink finding, and
  two server-export findings (exit code 1 for detected findings).
