# Milestone: comma-expression taint (2026-10-19)

## Goal

Detect sensitive final values in JavaScript comma expressions without falsely reporting discarded sensitive operands as the expression result.

## Delivered

- Added RHS-only result propagation for the comma operator, reusing plain-assignment result handling.
- Preserved traversal of earlier operands and their existing assignment effects.
- Added a dedicated fixture, three analyzer regressions, and an end-to-end CLI regression.
- Specification: `docs/specs/comma-expression-taint.md`.

## Verification

- `npm test`: 41/41 passed (includes TypeScript build).
- `npm run lint` and `git diff --check`: passed.
- Built CLI scan: exit `1`, four client-boundary findings and one external-sink finding.

## Scope

This milestone is independent of the existing destructuring and arithmetic/bitwise proposals. It does not change assignment storage, control-flow feasibility, aliasing, or cross-module analysis. See the specification for exact result semantics and limitations.
