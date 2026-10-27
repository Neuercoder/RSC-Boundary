# Comma-expression taint (2026-10-27)

## Status

Implemented and locally verified.

## Scope delivered

- Propagate only final-operand taint through comma expressions, including nesting.
- Keep discarded sensitive operands from tainting clean expression results.
- Preserve assignment side effects in earlier operands.
- Add a neutral-name fixture, two analyzer tests, and a CLI regression test.
- Document behavior in the [specification](../specs/comma-expression-taint.md).

## Limits and non-goals

No changes to control-flow feasibility, alias tracking, clean-overwrite handling,
or cross-module type-aware dataflow. This milestone concerns comma operators,
not argument or array separators.

## Verification results

- Before the fix, the new regression tests failed: the CLI observed one finding
  instead of five.
- `npm test`: passed, 40/40 tests, including strict TypeScript build and test compilation.
- `npm run lint`: passed.
- `git diff --check`: passed.
