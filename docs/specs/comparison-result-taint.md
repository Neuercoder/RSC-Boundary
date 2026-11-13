# Comparison-result taint propagation

## Goal

Detect sensitive information exposed through equality or relational comparisons.
A boolean result can reveal information about a sensitive operand, so comparison
is not treated as sanitization.

## Behavior

- For `==`, `!=`, `===`, `!==`, `<`, `<=`, `>`, and `>=`, propagate
  taint from either operand using the existing binary-expression evaluator.
- Preserve existing source reasons and the existing first-tainted-operand
  preference when both operands are sensitive.
- Apply the behavior anywhere expression taint is evaluated, including variable
  initializers, nested object values, template substitutions, client-component
  props, and external-sink arguments.
- Comparisons of public operands remain clean.
- No new rules, configuration, dependencies, or changes to finding metadata.

## Acceptance

The `comparison-taint` fixture, with sensitive-name heuristics disabled, yields
exactly 19 client-boundary findings and one external-sink finding:

- All eight operators are exercised with the sensitive source on each side.
- Derived variables, nested object values, and template substitutions propagate
  the result; inline uses retain the environment-source reason.
- All eight public/public comparisons and a public sink remain clean.
- The CLI returns exit code 1 and reports the same 20 findings.

## Limits

This is conservative expression-level dataflow, not constant evaluation or
control-flow feasibility analysis. It does not prove whether a comparison is
always true or false. Membership/type operators (`in`, `instanceof`), arithmetic,
alias tracking, and cross-module type-aware analysis are outside this milestone.
