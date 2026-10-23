# Destructuring-assignment taint (2026-10-23)

## Status

Implemented and locally verified.

## Scope delivered

- Recognize object/array assignment patterns as expression AST nodes instead of declaration bindings.
- Recursively propagate RHS taint through nested targets, renamed/shorthand properties, array holes, and array/object rest.
- Track identifier, property-access, and element-access targets without tainting sibling reads.
- Include tainted default initializers, including shorthand defaults, even with clean RHS inputs.
- Add a neutral-name fixture, analyzer assertions, built-CLI regression coverage, and a [behavior specification](../specs/destructuring-assignment-taint.md).

## Limits and non-goals

Preserve the existing monotonic fixpoint and whole-source conservative model.
No alias tracking, field-sensitive extraction, control-flow feasibility,
computed-key or sensitive-member inference for clean inputs, loop assignment
patterns, or cross-module type-aware dataflow is added.

## Verification results

- Regression before the fix: the analyzer and built CLI each found only one of ten expected boundary leaks.
- `npm test`: passed, 39/39 tests, including strict build and test compilation.
- `npm run lint`: passed.
- `git diff --check`: passed.
- The new fixture produces ten client-boundary findings; three clean assignments/defaults and two sibling accesses remain clean.
