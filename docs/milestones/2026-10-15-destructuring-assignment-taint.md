# Milestone: 2026-10-15 — Destructuring Assignment Taint

Status: implemented and locally verified.

## Objective

Close the assignment-taint milestone's destructuring gap: assignment patterns
are expression nodes in TypeScript's AST, unlike declaration binding patterns.

## Deliverables

- `src/analyzer.ts`: recursive assignment-target walker for object/array `=`
  patterns, nested/member/indexed targets, rest elements, holes, and defaults.
  Preserve the existing ordinary-assignment path and provenance.
- `test/fixtures/destructuring-assignment-taint/`: eleven sensitive flows and
  four clean boundary props using neutral target names.
- `test/analyzer.test.ts`: propagation/provenance and exact-finding regressions,
  with sensitive identifier/member matching disabled.
- `test/cli.test.ts`: end-to-end scan, eleven expected findings, exit 1.
- [Behavior specification](../specs/destructuring-assignment-taint.md).

## Verification

- Before the implementation, the new analyzer regressions failed: only two
  of the eleven expected flows were reported.
- `npm test`: 40/40 tests pass, including the strict TypeScript build.
- `npm run lint` and `git diff --check`: pass.
- CLI fixture scan: exit 1 with eleven client-boundary findings.

## Limits

Conservative aggregate taint and default evaluation; no precise field/position
selection, alias tracking, clean-overwrite clearing, or new sensitive-member
source inference. See the specification for the full scope.
