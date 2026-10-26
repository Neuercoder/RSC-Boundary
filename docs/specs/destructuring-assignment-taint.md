# Destructuring Assignment Taint

Status: implemented in milestone [2026-10-26](../milestones/2026-10-26-destructuring-assignment-taint.md).

## Goal

Detect sensitive values copied into existing bindings through object and array
destructuring assignments. TypeScript represents these targets as object/array
expression nodes, unlike declaration binding patterns.

## Behavior

- For a tainted RHS, conservatively propagate its provenance to every target:
  shorthand, renamed properties, nested object/array patterns, rest targets,
  property accesses, and indexed accesses.
- Skip array holes. Do not taint property keys or unrelated sibling indices.
- Include taint from shorthand, renamed, array, and nested defaults even if the
  incoming RHS is clean. Defaults are considered possible, without determining
  whether a value is actually missing.
- Feed assigned targets into the existing per-file monotonic fixpoint. Preserve
  ordinary assignment provenance and assignment-expression result behavior.
- Keep fully clean destructuring and defaults clean.

For example, `({ value: title } = { value: process.env.API_SECRET })` taints
`title`, and `[title = process.env.API_SECRET] = []` also taints `title`.

## Limits

Whole-RHS taint is not field-sensitive: one sensitive field can taint all targets.
Clean overwrites do not clear taint. Alias tracking, computed-key selection,
control-flow/default feasibility, cross-module dataflow, and changes to
declaration binding patterns are outside this milestone.

## Verification

The fixture covers shorthand, renaming, nesting, array holes/rest, object rest,
member/index targets, and default sources, with clean/default/sibling controls.
Analyzer tests disable sensitive-name heuristics and assert source provenance.
CLI tests assert the twelve expected client-boundary findings.
