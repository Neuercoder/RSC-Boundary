# CLI argument validation

## Goal

Prevent misspelled options from silently scanning a different target or producing
an unexpected output format. Support literal paths that begin with a dash.

## Contract

- Syntax: `rsc-boundary scan [--json] [--] [path]`.
- At most one path is accepted; omitted paths default to the current directory.
- Before `--`, `--json` enables JSON output and may appear before or after the
  path. Repeated `--json` is harmless. `--help` prints usage without scanning.
- Unknown long or short options, including `--json=true`, return exit code 2,
  write a diagnostic to stderr, and leave stdout empty. Validation happens
  before filesystem access or analysis. More than one path is also an error.
- `--` ends option parsing. Every subsequent argument is a literal path,
  including `--json`, `--help`, or another `--`. A lone `-` is a literal path,
  not standard input. A terminator without a path retains the default target.
- Help is returned only after scan arguments pass validation. Top-level
  `--help` remains supported; no command prints usage and returns code 2.
- Existing finding output, configuration resolution, and scan exit codes
  (0 clean, 1 findings, 2 error) remain unchanged.

## Non-goals

No short-option aliases, combined flags, stdin scanning, multiple targets,
new output formats, or analyzer changes.

## Acceptance

Process-level tests exercise unknown options, excess paths, option order,
repeated JSON flags, escaped dash-prefixed paths, the default target after a
terminator, help, and missing commands. Existing analyzer and CLI tests,
TypeScript build, lint, and whitespace checks must pass.
