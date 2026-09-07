# Milestone 2026-09-07 — Re-export Traversal (barrel files)

- **Status:** Implemented (landed to `main`)
- **Date:** 2026-09-07
- **Spec:** [docs/specs/re-export-traversal.md](../specs/re-export-traversal.md)

## Goal

Close the barrel-file blind spot of the taint analyzer. Next.js codebases
re-export server values, session helpers, and UI components through barrels
(`export * from`, `export { x } from`, `export * as ns from`), and the core
engine stopped at direct imports — so a sensitive value re-exported through a
barrel flowed into importers and client components unflagged, and the barrel
itself (no `server-only` import of its own) was never reported. This milestone
follows re-export edges across scanned files (alias-aware, cycle-safe): barrels
re-exporting sensitive values are flagged as server-module exporters, their
importers inherit the taint, and client components imported through barrels
still resolve as client boundaries.

## Scope

- `src/analyzer.ts` — re-export edge indexing (`export *` sources, `export
  { x } from` bindings, `export * as ns` namespaces, import sources,
  namespace-import bindings); a cross-file propagation step
  (`propagateReExports`) plus local resolvers so importers inherit barrel
  taint; barrel server-module marking (`reExportsSensitive`) so pure barrels
  emit `rsc/server-only-export` without their own `server-only` import;
  client-component resolution through `export *` chains
  (`resolveClientTarget`, namespace-member tags via barrels).
- Cycle safety throughout: every traversal carries a visited file set; the
  `a ↔ b` re-export cycle terminates and contributes no findings.
- Fixture app + unit/CLI tests covering `export *`, named, namespace,
  two-hop chain, re-export cycle, barrel-imported values/functions/namespace
  members, and a client component arriving through a barrel.
- Spec + milestone docs; core-spec §11 and README limitation lines updated.

## Deliverables

| Path | Purpose |
| --- | --- |
| `src/analyzer.ts` | Re-export edge index, cross-file propagation, barrel server marking, barrel-aware client resolution |
| `test/fixtures/re-export/` | Barrel app: star/named/namespace/chained/cyclic re-exports + barrel-imported client usage |
| `test/analyzer.test.ts` | Barrel export findings, importer inheritance, cycle termination |
| `test/cli.test.ts` | End-to-end scan of the re-export fixture |
| `docs/specs/re-export-traversal.md` | Behavior specification |

## Verification

- `npm run build` — clean `tsc` compile (strict).
- `npm test` — all prior tests plus 4 new tests pass (3 analyzer + 1 CLI).
- `npm run lint` — clean `eslint`.
- Smoke run: `node dist/cli.js scan test/fixtures/re-export` reports the
  barrel re-exports, the namespace re-export, the chained hops, and the
  client-boundary flow through the barrel-imported component (exit 1).

## Out of scope (future milestones)

- Barrels re-exporting modules outside the scanned set (unresolved/excluded
  files) stay silent for those edges; single-file barrel scans report
  nothing by design.
- `export default` does not flow through `export *` (ESM semantics).
- Cross-module type-aware dataflow remains open; see the core
  specification's limitations.
