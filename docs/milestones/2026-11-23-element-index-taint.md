# Milestone 2026-11-23 — Element Index Taint

## Scope

Preserve sensitive-source tracking when a sensitive index selects a public value.

- Specification: [element-index-taint.md](../specs/element-index-taint.md)
- Regression fixture: `test/fixtures/element-index-taint/`
- Covers object, array, optional, stored, assigned, wrapped, nested, template,
  and repeated element reads, while retaining sensitive-base propagation.
- Client props, external sinks, and server exports use existing rules.
- Public reads and discarded/void index results stay clean. No dependency or
  configuration changes.

## Verification

- Before the fix, both new regressions fail: only the sensitive-base client
  prop is detected, rather than ten client props, one sink, and one export.
- `npm test`: passed (55/55, including build and test compilation).
- `npm run lint` and `git diff --check`: passed.
- Built CLI regression: ten client-boundary findings, one external-sink
  finding, and one server-export finding; exit code 1.
