# Tagged-template callable provenance (2026-10-22)

## Status

Implemented and locally verified.

## Scope delivered

- Propagate a tag's taint to its tagged-template result, including templates
  without substitutions.
- Reuse existing server-import, alias, member-read, and local-return provenance.
- Preserve configured-source priority and substitution propagation; clean tags
  and clean substitutions stay silent.
- Add a neutral-name fixture plus analyzer and CLI regression coverage.

The [specification](../specs/tagged-template-provenance.md) records behavior
and limits. New sink syntax, sanitization, and type-aware call analysis are
out of scope.

## Verification results

- Before the change, both new regression tests failed: two boundary findings
  were detected instead of six.
- `npm test`: passed, 39/39 tests, including TypeScript build and test compilation.
- `npm run lint`: passed.
- `git diff --check`: passed.
