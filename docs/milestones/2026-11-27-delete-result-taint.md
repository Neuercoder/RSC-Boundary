# Milestone 2026-11-27 — Delete Result Taint

## Scope

Preserve sensitive-source tracking through the boolean result of deletion.

- Specification: [delete-result-taint.md](../specs/delete-result-taint.md)
- Regression fixture: `test/fixtures/delete-result-taint/`
- Covers direct/optional deletion, stored and aliased operands, wrappers,
  nested objects, templates, computed keys, and function returns.
- Applies existing client-boundary, external-sink, and server-export rules.
- Public properties, void results, and discarded comma operands stay clean.
- No dependency or configuration changes.

## Verification

- Before the fix, the new analyzer regression found 0 of 8 required client
  props and the built CLI exited cleanly rather than reporting leaks.
- `npm test`: passed (62/62, including build and test compilation).
- `npm run lint` and `git diff --check`: passed.
- Built CLI regression: 8 client-boundary findings, one external-sink
  finding, and one server-export finding; exit code 1.
