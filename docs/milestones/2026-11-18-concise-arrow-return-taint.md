# Concise arrow return taint

## Scope

Detect sensitive implicit returns from variable-bound concise arrow functions
using the existing return and expression analysis.

- Specification: [concise-arrow-return-taint.md](../specs/concise-arrow-return-taint.md)
- Regression fixture: `test/fixtures/concise-arrow/`
- Covers ordinary/async arrows, parenthesized and derived values, object results,
  aliases, stored results, callable client props, external sinks, and server exports.
- Preserves public returns, discarded comma results, uncalled nested functions,
  and existing block-body behavior. No new dependencies or configuration.

## Verification

- Before the fix, the new regression reported zero of eight expected client
  findings; after the fix, all eight are reported.
- `npm test`: passed (47/47, including build and test compilation).
- `npm run lint`: passed.
- `git diff --check`: passed.
- Built CLI: eight client-boundary findings, one external-sink finding, and
  two server-export findings (exit code 1 for findings).
