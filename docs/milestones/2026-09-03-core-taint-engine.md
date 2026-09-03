# Milestone 2026-09-03 — Core AST Taint Engine

- **Status:** Implemented (landed to `main`)
- **Date:** 2026-09-03
- **Spec:** [docs/specs/core-taint-analysis.md](../specs/core-taint-analysis.md)

## Goal

Turn the scaffolded `rsc-boundary` project into a working static analyzer:
detect sensitive values (env secrets, DB records, session data) crossing React
Server Component boundaries into client components or external sinks, driven by
a real TypeScript AST taint engine, CLI, config, tests, and CI.

## Scope

- TypeScript AST-based taint analysis over `.ts`/`.tsx` sources (fixpoint
  passes per file, cross-file "use client" resolution for local imports).
- Rules:
  - `rsc/client-boundary-prop` — tainted value passed as a prop / child /
    spread to a known local client component.
  - `rsc/server-only-export` — server module (`server-only`, `next/headers`,
    `next/cookies`, `db`/`prisma`/`server` import patterns) exports a tainted
    value.
  - `rsc/external-sink` — tainted value reaches `console.*`, `alert`,
    `postMessage`.
  - `rsc/client-imports-server` — a `"use client"` file imports a server
    module.
- Sources: `process.env.*`, sensitive identifier/member name patterns,
  server-module imports and calls, per-request data (`cookies()`/`headers()`/
  `draftMode()`), data-source calls (`db.*`, `prisma.*`, `sql`, …).
- CLI (`scan [path] [--json]`) with exit codes 0/1/2, JSON output, and config
  file support (`.rscboundaryrc.json` / `rscboundary.config.json`).
- Tests on `node:test` with intentional leak/clean fixture apps; GitHub Actions
  CI running build + tests + lint.

## Deliverables

| Path | Purpose |
| --- | --- |
| `src/analyzer.ts` | Taint engine (sources, propagation, sinks, cross-file client index) |
| `src/config.ts` | Config model, defaults, file loading/merging |
| `src/cli.ts` | CLI `scan` command |
| `src/index.ts` | Public programmatic API |
| `test/analyzer.test.ts`, `test/cli.test.ts` | Unit + CLI integration tests |
| `test/fixtures/` | Leaky, clean, and member-read example apps |
| `.github/workflows/ci.yml` | CI: install, build, test, lint |
| `docs/specs/core-taint-analysis.md` | Behavior specification |

## Verification

- `npm run build` — clean `tsc` compile (strict).
- `npm test` — 11 tests passing (analyzer rules, suppression, clean fixtures,
  CLI exit codes, built-CLI JSON output).
- `npm run lint` — clean `eslint`.
- Smoke run: `node dist/cli.js scan test/fixtures/leaky` reports
  findings (8) with exit code 1; `test/fixtures/clean` reports none with exit
  code 0.

## Out of scope (future milestones)

- Cross-file taint summaries (function returns across module boundaries beyond
  server-module bindings), TS path-alias/`@/` imports, JSX member-component
  resolution (`<Foo.Bar>`), `export *` re-export traversal, serializers/DTO
  suggestions, Next.js API-route and middleware coverage.
