# Milestone 2026-11-22 — Comparison Result Taint

## Scope

Preserve sensitive-source tracking through comparison-result expressions.

- Specification: [comparison-result-taint.md](../specs/comparison-result-taint.md)
- Regression fixture: `test/fixtures/comparison-taint/`
- Covers equality, ordering, membership, and instance checks with either
  operand tainted, plus stored, wrapped, nested, template, repeated, and
  logically composed results.
- Client props, external sinks, and server exports use existing rules.
- Public comparisons, discarded comma operands, and void results stay
  clean. No dependency or configuration changes.

## Verification

- New analyzer and built-CLI regressions fail before the fix: zero of the
  expected 26 client-boundary findings are reported, and the CLI exits clean.
- `npm test`: passed (53/53, including build and test compilation).
- `npm run lint` and `git diff --check`: passed.
- Built CLI regression: 26 client-boundary findings, one external-sink
  finding, and one server-export finding; exit code 1.
