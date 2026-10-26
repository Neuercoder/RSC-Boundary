# Milestone — 2026-10-26 — Destructuring Assignment Taint

## Status

Implemented and locally verified; publication tracked separately.

## Scope

Close the assignment-taint milestone's destructuring-assignment gap using the
actual TypeScript expression AST nodes. See the
[specification](../specs/destructuring-assignment-taint.md).

## Deliverables

- Recursive propagation into object/array assignment targets, nesting, rest,
  member/index targets, and sensitive defaults.
- Existing ordinary-assignment provenance preserved.
- Dedicated fixture with twelve positive boundary cases and three clean controls.
- Analyzer and CLI regression coverage; README/specification links.

## Verification

- Before implementation, the new CLI regression found only 2 of 11 initial cases.
- After implementation and shorthand-default coverage: `npm test` passes 39/39.
- `npm run lint` and `git diff --check` pass.

## Known limitations

Conservative whole-RHS/default taint; no field-sensitive selection, alias
resolution, taint clearing, or control-flow feasibility analysis.
