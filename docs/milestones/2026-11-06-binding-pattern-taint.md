# Recursive binding-pattern taint (2026-11-06)

## Status

Implemented and locally verified.

## Scope delivered

- Bind nested declaration and parameter sources to leaf destinations rather than
  storing inaccessible pattern-text keys.
- Merge default, incoming, sensitive-member, and sensitive-name taint recursively.
- Recognize sensitive object binding reads independently of incoming source taint,
  including string-literal keys; do not treat rest destination names as reads.
- Add a neutral-name fixture, exact-location analyzer assertions, and a built-CLI
  JSON and exit-status regression.

The [specification](../specs/binding-pattern-taint.md) records behavior and limits.
No dependencies, CLI options, or diagnostic rule IDs change.

## Verification results

- Before implementation, the new fixture produced zero boundary findings;
  both new analyzer and CLI regressions failed.
- The completed fixture produces thirteen boundary findings and leaves both
  clean nested-default controls unflagged.
- `npm test`: passed, 41/41 tests, including strict TypeScript builds.
- `npm run lint`: passed.
- `git diff --check`: passed.
