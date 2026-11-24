# Milestone 2026-11-24 — Element Access Key Taint

## Scope

Preserve sensitive-source tracking through computed lookup keys.

- Specification: [element-key-taint.md](../specs/element-key-taint.md)
- Regression fixture: `test/fixtures/element-key-taint/`
- Covers object/array and optional lookups, direct/stored/aliased keys,
  nested and wrapped expressions, templates, repeated reads, and returns.
- Existing client-boundary, external-sink, and server-export rules apply.
- Public lookups, discarded comma operands, and void results remain clean.
- No dependency or configuration changes.

## Verification

- Before the fix, the analyzer regression reports only the existing
  tainted-base finding: 1 of 12 required client-boundary findings.
- `npm test`: passed (55/55, including build and test compilation).
- `npm run lint` and `git diff --check`: passed.
- Built CLI regression: 12 client-boundary findings, one external-sink
  finding, and one server-export finding; exit code 1.
