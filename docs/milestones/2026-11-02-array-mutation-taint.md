# Milestone 2026-11-02 — Array mutation value taint

- **Status:** Implemented and locally verified; awaiting merge
- **Spec:** [Array mutation value taint](../specs/array-mutation-taint.md)

## Goal

Extend collection mutation analysis to `splice` and `fill` without mistaking
position/count arguments for stored sensitive data.

## Delivered

- Value-position-aware receiver propagation in `taintMutationReceiver`.
- Fixture and analyzer/CLI regressions for identifier and property receivers,
  later inserted values, clean/index-only calls, absent arguments, and the
  non-mutating `toSpliced` control.
- Existing receiver/provenance and fixpoint behavior reused unchanged.

## Verification

- Before implementation, both new regressions failed: the analyzer found no
  leaks and the CLI returned 0 instead of 1.
- `npm test`: passed (39/39).
- `npm run lint` and `git diff --check`: passed.
- Built CLI scan: exactly three boundary findings, exit code 1.

## Delivery

Direct default-branch writes are blocked by workspace policy; delivery uses
an explicit feature-branch push and a pull request targeting `main`.
