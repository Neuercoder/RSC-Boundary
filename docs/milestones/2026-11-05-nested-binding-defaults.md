# Milestone: nested binding-default taint

**Date:** 2026-11-05
**Status:** Implemented and locally verified

## Goal

Close the false negative where a sensitive nested destructuring default tainted
only a pattern-text key, leaving the actual bound variables untracked.

## Delivered

- [Specification](../specs/nested-binding-defaults.md) covering behavior and limits.
- Recursive default binding propagation using the existing binding-name helper.
- A neutral-name fixture covering object, array, mixed nesting, inner clean
  defaults, declaration and parameter bindings, and four clean controls.
- Analyzer regression asserting exact finding locations and source evidence, plus
  CLI regression asserting findings and exit status.

## Verification

The two new regression tests failed before the fix: the analyzer found no leaks
and the CLI returned 0. After the fix, `npm test` passed all 41 tests, including
build and test compilation. The fixture reports six client-boundary leaks while
leaving all four clean controls unflagged. Lint and `git diff --check` passed.

## Limits

Defaults are considered without runtime feasibility checks. A tainted default
conservatively taints all nested destinations; no per-member projection,
interprocedural argument binding, or scope/alias model is introduced.
