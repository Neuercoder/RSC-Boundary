# Milestone 2026-11-28 — Constructor Source Taint

## Scope

Recognize configured data sources when invoked with `new`.

- Specification: [constructor-source-taint.md](../specs/constructor-source-taint.md)
- Regression fixture: `test/fixtures/constructor-source-taint/`
- Covers identifier/member constructors, omitted parentheses, stored and
  wrapped results, nested objects, templates, and function returns.
- Preserves sensitive-argument precedence and default source patterns.
- Public constructors and discarded results remain clean; special request
  sources remain call-only.
- No dependency, rule, or configuration-field changes.

## Verification

- Before the fix, all three new regressions failed: configured-source
  analyzer and CLI checks found only one of ten expected client props;
  the default-pattern regression found one of two.
- `npm test`: passed (65/65, including build and test compilation).
- `npm run lint` and `git diff --check`: passed.
- Built CLI regression: ten client-boundary findings, one external-sink
  finding, one server-export finding; exit code 1.
