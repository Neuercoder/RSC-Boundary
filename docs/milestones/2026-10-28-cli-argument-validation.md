# Milestone: CLI argument validation

Date: 2026-10-28

## Scope and rationale

Implement the [CLI argument specification](../specs/cli-argument-validation.md).
The previous parser discarded unknown long options and treated `--` as a path
rather than an option terminator. A misspelled JSON flag could silently produce
human output, and escaped dash-prefixed paths did not work.

This milestone is independent of the existing open analyzer milestone PRs.
It changes only CLI parsing, documentation, and regression tests.

## Delivered

- Explicit option parsing with diagnostics and exit code 2 for invalid arguments.
- Standard `--` termination and literal dash-prefixed scan paths.
- Preserved JSON output, help, default target, and clean/finding exit codes.
- Process-level regression tests asserting exit status and stdout/stderr.

## Verification

- `npm test`: passed, 41/41 tests (includes the TypeScript production/test builds).
- `npm run lint`: passed.
- `git diff --check`: passed.
- Process-level checks confirm invalid input returns 2 without stdout and
  escaped paths produce valid JSON without triggering help.
