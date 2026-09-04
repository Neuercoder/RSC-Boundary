# Milestone 2026-09-04 — Path Alias Resolution (`@/` imports)

- **Status:** Implemented (landed to `main`)
- **Date:** 2026-09-04
- **Spec:** [docs/specs/path-alias-resolution.md](../specs/path-alias-resolution.md)

## Goal

Close the number-one blind spot of the core engine: Next.js apps almost
universally import through `tsconfig` path aliases (`@/components/card`,
`@/lib/db`) rather than relative paths, so the client-boundary and
server-module rules silently missed those flows. This milestone adds
tsconfig-style alias resolution to every import the analyzer follows, with a
sensible default (`@/*` → project root) and full configuration support.

## Scope

- New `pathAliases` config field: alias pattern → replacement paths
  (`"@/*": ["./*"]`), with `*` wildcard capture and substitution, resolving
  against the project root (the config file's directory, or the scan root).
- Default mapping matching the `create-next-app` convention: `@/*` → `./*`.
- `resolveImport()` API: relative imports delegate to the existing resolver;
  non-relative specifiers are rewritten through `pathAliases` and resolved
  with the same extension/`index.*` fallbacks.
- CLI wires the project root through to analysis so `rsc-boundary scan .`
  resolves aliases end to end, including aliases declared in
  `.rscboundaryrc.json` / `rscboundary.config.json`.
- Fixture apps + unit/CLI tests covering default and configured aliases.

## Deliverables

| Path | Purpose |
| --- | --- |
| `src/analyzer.ts` | `resolveImport()` + alias-aware import indexing; `rootDir` option |
| `src/config.ts` | `pathAliases` field, default, validation, config-file parsing |
| `src/cli.ts` | Project-root detection (config dir / scan root) forwarded to analysis |
| `src/index.ts` | Export `resolveImport` |
| `test/analyzer.test.ts`, `test/cli.test.ts` | Alias resolution + end-to-end scan tests |
| `test/fixtures/aliases/` | App importing client components and server libs via default `@/` |
| `test/fixtures/alias-config/` | App importing via a custom alias declared in `.rscboundaryrc.json` |
| `docs/specs/path-alias-resolution.md` | Behavior specification |

## Verification

- `npm run build` — clean `tsc` compile (strict).
- `npm test` — 21 tests passing (6 new: resolver unit tests, aliased
  client-boundary + server-export findings, CLI scans for default and
  configured aliases).
- `npm run lint` — clean `eslint`.
- Smoke runs: `node dist/cli.js scan test/fixtures/aliases` reports the
  aliased prop/export leaks (exit 1); same for `test/fixtures/alias-config`
  with its custom alias (exit 1).

## Out of scope (future milestones)

- Member JSX components (`<Foo.Bar>`), `export *` re-export traversal, and
  cross-module type-aware dataflow remain open; see the core specification's
  limitations.
