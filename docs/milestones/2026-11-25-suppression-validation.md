# Milestone 2026-11-25 — Suppression Selector Validation

## Scope

Prevent malformed configuration entries from silently hiding every finding.

- Specification: [suppression-validation.md](../specs/suppression-validation.md).
- Shared selector validation for JSON configuration and programmatic options.
- Reject arrays, selector-free objects, blank selectors, and invalid line numbers.
- Preserve valid selectors, mixed lists, and all-field matching.
- No dependency changes or broader taint-analysis changes.

## Verification

- Before the fix, new regressions reproduced invalid arrays being accepted,
  invalid programmatic entries crashing analysis, and the CLI incorrectly
  exiting clean despite a leak.
- `npm test`: passed (58/58, including build and test compilation).
- `npm run lint` and `git diff --check`: passed.
- Built CLI regression confirms one external-sink finding and exit code 1
  despite malformed suppression entries.
