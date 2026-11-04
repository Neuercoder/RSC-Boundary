# Milestone 2026-09-11 — Server Actions (`"use server"`)

- **Status:** Implemented (pushed to `main`)
- **Date:** 2026-09-11
- **Spec:** [docs/specs/server-actions.md](../specs/server-actions.md)

## Goal

Close the Server Actions blind spot of the taint analyzer. Next.js Server
Actions (`"use server"` modules and inline `"use server"` functions) execute
on the server but are callable from client components, so an action returning
a secret — or a sensitive value exported from its module — is a data-leak
boundary. The core engine only treated files importing `server-only` /
`next/headers` (or matching `sources.serverModules`) as server modules, so a
`"use server"` module with no such import was never reported as an exporter
and its functions' taint never reached callers. This milestone makes Server
Action modules and functions count as server-side: their sensitive exports
are flagged under the existing `rsc/server-only-export` rule, and their
return-value taint flows to importers (and into client-component props)
through the existing function-returns-tainted model.

## Scope

- `src/analyzer.ts` — directive detection (`hasServerDirective`, leading
  `"use server"` string literal; `"use client"` wins), per-file
  `isServerAction` / `serverActionNames` tracking, server-module marking for
  action files, and export guards (`checkExportedDeclarations`,
  `processExport`) that treat Server Action exports like any other server
  module. No new rule, severity, message shape, or exit-code contract.
- Fixture app + unit/CLI tests covering file-level `"use server"` value and
  function exports (with a clean action staying silent), inline
  `"use server"` functions (clean sibling silent), and the caller-to-client-
  component flow (`deleteAccount("user-1")` into `<Card title>`).
- Spec + milestone docs; core-spec §11 and README limitation lines updated.

## Deliverables

| Path | Purpose |
| --- | --- |
| `src/analyzer.ts` | Server-action detection, marking, and export coverage |
| `test/fixtures/server-actions/` | Action module, inline action, and calling page + client component |
| `test/analyzer.test.ts` | Module-export and inline-action/caller inheritance tests |
| `test/cli.test.ts` | End-to-end scan of the server-actions fixture |
| `docs/specs/server-actions.md` | Behavior specification |

## Verification

- `npm run build` — clean `tsc` compile (strict).
- `npm test` — all prior tests plus 3 new tests pass (2 analyzer + 1 CLI, 30 total).
- `npm run lint` — clean `eslint`.
- Smoke run: `node dist/cli.js scan test/fixtures/server-actions --json` reports
  the module value/function exports, the inline action, and the
  client-boundary flow through the action call (exit 1); the clean fixture
  still scans empty (exit 0).

## Out of scope (future milestones)

- Directive detection is syntactic (leading string literal only); computed or
  nested directives are not directives.
- `"use client"` takes precedence when both directives are present.
- Cross-module type-aware dataflow remains open; see the core
  specification's limitations.
