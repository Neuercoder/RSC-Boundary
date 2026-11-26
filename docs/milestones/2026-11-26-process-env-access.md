# Milestone 2026-11-26 — Process Environment Source Recognition

## Scope

Recognize literal bracket access to the environment and stop treating all
process metadata as sensitive environment data.

- Specification: [process-env-access.md](../specs/process-env-access.md).
- Support string-literal and no-substitution template `env` keys, including
  optional accesses and stored environment objects.
- Preserve ordinary configured rules and tracked propagation.
- Cover client props, external sinks, server exports, and clean controls.
- No dependencies or configuration changes.

## Verification

- Before the fix, both new regressions failed: bracket accesses were missed
  while unrelated dotted process metadata was flagged.
- `npm test`: passed (60/60, including build and test compilation).
- `npm run lint` and `git diff --check`: passed.
- Built CLI regression requires eight findings and exit code 1.
