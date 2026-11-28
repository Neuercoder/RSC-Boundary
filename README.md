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
- Iteration / collection taint (`for...of`, `.map` callbacks, `.push` mutation): [docs/specs/iteration-collection-taint.md](docs/specs/iteration-collection-taint.md)
- Assignment-operator taint (`&&=`, `||=`, `+=` element targets, assignment-expression results): [docs/specs/assignment-taint.md](docs/specs/assignment-taint.md)
- Comma-expression result taint: [docs/specs/comma-expression-taint.md](docs/specs/comma-expression-taint.md)
- Computed object-key taint: [docs/specs/computed-object-key-taint.md](docs/specs/computed-object-key-taint.md)
- Arithmetic and bitwise expression-result taint: [docs/specs/arithmetic-bitwise-taint.md](docs/specs/arithmetic-bitwise-taint.md)
- Arithmetic and bitwise compound assignments: [docs/specs/compound-arithmetic-taint.md](docs/specs/compound-arithmetic-taint.md)
- Tagged-template callee taint: [docs/specs/tagged-template-callee-taint.md](docs/specs/tagged-template-callee-taint.md)
- Object method and getter return taint: [docs/specs/object-callable-return-taint.md](docs/specs/object-callable-return-taint.md)
- Concise arrow return taint: [docs/specs/concise-arrow-return-taint.md](docs/specs/concise-arrow-return-taint.md)
- Functional return taint (IIFEs, `.map`, `.flatMap`): [docs/specs/functional-return-taint.md](docs/specs/functional-return-taint.md)
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
`satisfies`, and `{ shorthand }` objects are transparent to taint), and
**2026-09-14 — Iteration / Collection Taint** (`for...of` / `for...in`
loop variables, `.map`-style callback element parameters, and
`.push`-style mutating calls propagate taint), and **2026-10-14 — Assignment
Taint** (`&&=` / `||=` target propagation, element-access `+=`, and assignment
expression results). Assignment-taint behavior and limitations are documented
in the linked spec and milestone. Known limitation (see spec §11): cross-module
type-aware dataflow is not yet covered.

Latest milestone: [constructor-source taint](docs/milestones/2026-11-28-constructor-source-taint.md) ([specification](docs/specs/constructor-source-taint.md)).

Configured data sources are recognized in constructor invocations as well as
calls and tagged templates. Sensitive arguments keep their provenance; public
constructors and discarded results stay clean.
Verified with 65 passing tests, build, and lint.

Earlier milestone: [delete-result taint](docs/milestones/2026-11-27-delete-result-taint.md) ([specification](docs/specs/delete-result-taint.md)).

Sensitive deletion results retain provenance across client props, external sinks,
and server exports. Public properties and discarded results stay clean.
Verified with 62 passing tests, build, and lint.

Earlier milestone: [process environment source recognition](docs/milestones/2026-11-26-process-env-access.md) ([specification](docs/specs/process-env-access.md)).

Static bracket access to `process["env"]` is recognized alongside `process.env`, while unrelated process metadata stays clean.

Earlier milestone: [suppression selector validation](docs/milestones/2026-11-25-suppression-validation.md) ([specification](docs/specs/suppression-validation.md)).
Malformed entries can no longer silently hide findings; valid suppression
matching is unchanged. Verification: 58 passing tests, build, and lint.

Earlier milestone: [element-access key taint](docs/milestones/2026-11-24-element-key-taint.md) ([specification](docs/specs/element-key-taint.md)).

Computed object/array lookups preserve sensitive-key provenance, including optional access and composed keys. Public lookups, discarded values, and void results stay clean. Verified with 55 passing tests, build, and lint.

Earlier milestone: [comparison-result taint](docs/milestones/2026-11-22-comparison-result-taint.md) ([specification](docs/specs/comparison-result-taint.md)).

Earlier milestone: [typeof-result taint](docs/milestones/2026-11-21-typeof-result-taint.md) ([specification](docs/specs/typeof-result-taint.md)).

Earlier milestone: [functional return taint](docs/milestones/2026-11-20-functional-return-taint.md) ([specification](docs/specs/functional-return-taint.md)).

Previous milestone: [concise arrow return taint](docs/milestones/2026-11-18-concise-arrow-return-taint.md) ([specification](docs/specs/concise-arrow-return-taint.md)).

Earlier milestone: [object method and getter return taint](docs/milestones/2026-11-17-object-callable-return-taint.md) ([specification](docs/specs/object-callable-return-taint.md)).

Earlier milestone: [tagged-template callee taint](docs/milestones/2026-11-16-tagged-template-callee-taint.md) ([specification](docs/specs/tagged-template-callee-taint.md)).

Earlier milestone: [arithmetic and bitwise compound-assignment taint](docs/milestones/2026-11-15-compound-arithmetic-taint.md) ([specification](docs/specs/compound-arithmetic-taint.md)).

Earlier milestone: [arithmetic and bitwise expression-result taint](docs/milestones/2026-11-14-arithmetic-bitwise-taint.md) ([specification](docs/specs/arithmetic-bitwise-taint.md)).

Earlier milestone: [comma-expression result taint](docs/milestones/2026-11-11-comma-expression-taint.md) ([specification](docs/specs/comma-expression-taint.md)).

Earlier milestone: [computed object-key taint](docs/milestones/2026-11-08-computed-object-key-taint.md) ([specification](docs/specs/computed-object-key-taint.md)).

Earlier milestone: [destructuring-assignment taint](docs/milestones/2026-11-04-destructuring-assignment-taint.md) ([specification](docs/specs/destructuring-assignment-taint.md)).
