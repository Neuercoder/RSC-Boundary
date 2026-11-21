# Comparison-result taint

Implemented sensitive-result propagation for the eight equality and relational
operators. Boolean comparisons now preserve operand taint and existing source
reasons, preventing comparison results from silently crossing client boundaries
or reaching external sinks.

- Specification: [comparison-result-taint.md](../specs/comparison-result-taint.md)
- Regression fixture: `test/fixtures/comparison-taint/`
- Acceptance: 19 client-boundary findings and one external sink, including
  both operand positions for every operator, derived values, nested values, and
  template substitutions. Public/public comparisons and a public sink stay clean.
- Scope excludes new rules/options, constant evaluation, control-flow feasibility,
  membership/type operators, and cross-module dataflow.

## Verification

- Regressions failed before implementation: zero boundary findings instead of
  19; the CLI returned 0 instead of 1.
- `npm test`: passed (44/44, including build and test compilation).
- `npm run lint`: passed.
- `git diff --check`: passed.
- Built CLI: 19 client-boundary findings and one external sink, exit code 1.
