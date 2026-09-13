# rsc-boundary

Static data-leak analyzer for Next.js / React Server Components (RSC).

Detects sensitive values (env secrets, DB records, session tokens, etc.)
flowing from server-only sources into RSC boundaries and client components.

## Quick start

```bash
npm install
npm run build
npm run scan -- <path>          # human-readable findings
npm run scan -- <path> --json   # findings as JSON (CI-friendly)
```

Exit codes: `0` = clean, `1` = findings, `2` = usage/runtime error.

## What it detects

| ruleId | What it flags |
| --- | --- |
| `rsc/client-boundary-prop` | Sensitive value passed as a prop/child to a local `"use client"` component |
| `rsc/server-only-export` | Server module exports a sensitive value (`export` of env-derived/DB-derived data) |
| `rsc/external-sink` | Sensitive value reaches `console.*`, `alert`, `postMessage` |
| `rsc/client-imports-server` | A `"use client"` file imports a server module (`server-only`, `db`, `prisma`, …) |

Sources tracked: `process.env.*`, sensitive names (`token`, `password`,
`secret`, `apiKey`, credentials, …), imports from server/db modules, data
source calls (`db.*`, `prisma.*`, `sql`, …), and per-request data
(`cookies()`, `headers()`, `draftMode()`). See the
[specification](docs/specs/core-taint-analysis.md) for the full rules.

## Configuration

Optional `.rscboundaryrc.json` / `rscboundary.config.json` at the scan root or
any parent directory — customize sources, external sinks, excludes, and
suppressions:

```jsonc
{
  "sources": { "serverModules": ["^server-only$", "lib/server"] },
  "pathAliases": { "@/*": ["./*"], "@ui/*": ["./src/components/*"] },
  "exclude": ["test/e2e"],
  "suppress": [{ "ruleId": "rsc/external-sink" }]
}
```

## Development

```bash
npm install
npm run build   # type-check + emit to dist/
npm test        # build + node:test suite (analyzer + CLI)
npm run lint    # eslint
```

Fixtures live in `test/fixtures/` (leaky / clean / member-read apps).
CI (`.github/workflows/ci.yml`) runs install, build, test, and lint.

## Documentation

- Behavior and CLI contract: [docs/specs/core-taint-analysis.md](docs/specs/core-taint-analysis.md)
- Import path-alias resolution (`@/*`): [docs/specs/path-alias-resolution.md](docs/specs/path-alias-resolution.md)
- Member JSX components (`<Foo.Bar>`): [docs/specs/member-jsx-components.md](docs/specs/member-jsx-components.md)
- Re-export traversal (barrel files): [docs/specs/re-export-traversal.md](docs/specs/re-export-traversal.md)
- Await / satisfies / shorthand passthrough: [docs/specs/await-satisfies-shorthand.md](docs/specs/await-satisfies-shorthand.md)
- Milestone tracker: [docs/milestones/](docs/milestones/)

## Current status

Implemented milestones **2026-09-03 — Core AST Taint Engine** (CLI, analyzer,
config, tests, CI), **2026-09-04 — Path Alias Resolution** (`@/` and custom
tsconfig-style import aliases, default `"@/*": ["./*"]`), and **2026-09-06 —
Member JSX Components** (compound tags like `<Card.Header>` and
`<Panel.Item>` are now treated as client-component boundaries), and
**2026-09-07 — Re-export Traversal** (barrel `export *` / `export { x }
from` / `export * as ns` chains resolve across files, cycle-safe), and
**2026-09-13 — Await / Satisfies / Shorthand Passthrough** (`await`,
`satisfies`, and `{ shorthand }` objects are transparent to taint). Known
limitation (see spec §11): cross-module type-aware
dataflow is not yet covered.
