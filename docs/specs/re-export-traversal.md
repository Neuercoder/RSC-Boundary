# Specification — Re-export Traversal (barrel files)

- **Version:** 1.0
- **Status:** implemented (milestone 2026-09-07)
- **Product:** `rsc-boundary` — static data-leak analyzer for Next.js / React Server Components
- **Extends:** [core-taint-analysis.md](core-taint-analysis.md)

## 1. Overview

Barrel files (`export * from "./secret"`, `export { x } from "./mod"`,
`export * as ns from "./mod"`) are the standard way Next.js codebases
re-export server values, session helpers, and UI components through a single
entry point. The core engine's cross-file model stopped at direct imports, so
a sensitive value re-exported through a barrel flowed into importers (and
client components) unflagged, and the barrel itself — which has no
`server-only` import of its own — was never reported as a server-module
exporter. This specification closes that gap: re-export edges are followed
across scanned files (alias-aware, cycle-safe), so barrels re-exporting
sensitive values are flagged, their importers inherit the taint, and client
components imported through barrels still resolve as client boundaries.

## 2. Behavior

For every scanned file, the analyzer records re-export edges while walking
its AST (relative and `pathAliases` specifiers resolve exactly like imports;
unresolvable or unscanned targets are ignored):

| Edge shape | Recording |
| --- | --- |
| `export * from "./secret"` | Star source: the resolved target file is added to the barrel's star set. |
| `export { x } from "./secret"` (incl. `as` renames) | Named binding: exported name → (target file, source-local name). |
| `export * as ns from "./secret"` | Namespace binding: `ns` → target file. |
| `import { x } from "./barrel"` | Import edge: the resolved barrel file is recorded as an import source. |
| `import * as ns from "./barrel"` | Namespace-import binding: `ns` → resolved file. |

Resolution rules:

1. `rsc/server-only-export` on barrels: `export *` chains are expanded
   (nested stars, `export { x } from` hops, local shadowing respected — a
   name shadowed by a local declaration or named re-export keeps its local
   meaning) and each sensitive name flowing through is reported on the barrel
   (`Server module re-exports sensitive value "X"`). `export { x } from`
   resolves through the source module per element; `export * as ns from`
   reports the namespace (`Server module re-exports sensitive namespace
   "ns"`) when the target module exports anything sensitive.
2. Barrels are server modules: a file that re-exports a sensitive name (or
   namespace) out of another scanned file is itself marked a server module
   (`serverReason = "re-exports sensitive value"`), so the export findings
   above are emitted even though the barrel never imports `server-only`
   itself. This marking propagates through the fixpoint — a two-hop
   `export *` chain flags every hop.
3. Importers inherit barrel taint: for each import edge, the imported name is
   resolved through the target's export chain (named hops, nested
   `export *`, `export * as ns` namespaces) and the local binding is tainted
   with the declaring module's provenance. Namespace imports (`import * as
   ns`) are tainted when the target's first sensitive export resolves, and
   member reads through them (`ns.secret`, `secrets.API_TOKEN`) resolve
   through the same chain.
4. Client components via barrels: importing a component through a barrel
   (`import { Card } from "./ui-barrel"` where the barrel does `export *
   from "./card"`) indexes the local binding against the transitively
   resolved client file, so `rsc/client-boundary-prop` still fires on its
   props/children. `import * as UI from "./barrel"` likewise resolves member
   tags (`<UI.Card>`) through the barrel's star chain.
5. Cycles and missing targets are safe: every traversal carries a visited
   file set, so `export *` cycles (`a ↔ b`) contribute nothing and terminate;
   specifiers that do not resolve (or resolve outside the scanned set)
   contribute nothing.

No rule internals change beyond resolution: severities, message shapes (barrel
messages use the `re-exports` / `Server module exports` wording), Finding
shape, and the exit-code contract (0 clean / 1 findings / 2 usage-error) are
unchanged.

## 3. Message examples

```
lib/barrel.ts:1:1  error  rsc/server-only-export  Server module re-exports sensitive value "API_TOKEN"
lib/named.ts:1:1  error  rsc/server-only-export  Server module exports sensitive value
lib/ns.ts:1:1  error  rsc/server-only-export  Server module re-exports sensitive namespace "secrets"
app/page.tsx:11:7  error  rsc/client-boundary-prop  Sensitive value flows into client component <Card> prop "apiKey"
```

## 4. Proof-of-concept fixtures

- `test/fixtures/re-export/` — `lib/secret.ts` (server-only module exporting
  a sensitive value and a tainted function) re-exported through
  `lib/barrel.ts` (`export *`), `lib/named.ts` (`export { x } from`, one per
  line), `lib/ns.ts` (`export * as ns from`), and a two-hop chain
  (`lib/chain-a.ts` → `lib/mid.ts` → secret); `lib/cyc-a.ts` ↔ `lib/cyc-b.ts`
  form a re-export cycle that must terminate; `app/page.tsx` imports the
  value, the function, and a namespace member through the barrels and renders
  a client component that itself arrives through `lib/ui-barrel.ts`
  (`export *` of a `"use client"` file). All barrel, import, and boundary
  flows report; the cycle contributes no findings and does not hang.

## 5. Known limits

- Only files in the scanned set participate: a barrel re-exporting a module
  outside the scan (unresolved specifier, excluded path, unscanned file) is
  silent for that edge. In particular, scanning a single barrel file in
  isolation reports nothing — the declaring module must be scanned too
  (directory scans satisfy this).
- Default exports do not flow through `export *` (matching ESM semantics);
  only direct `export default` declarations propagate to default importers.
- Type-aware resolution is not performed: any sensitive export flowing
  through the chain taints the importing binding conservatively.
