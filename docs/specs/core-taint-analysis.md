# Specification — RSC Boundary Taint Analysis (core engine)

- **Version:** 1.0
- **Status:** implemented (milestone 2026-09-03)
- **Product:** `rsc-boundary` — static data-leak analyzer for Next.js / React Server Components

## 1. Overview

`rsc-boundary` statically detects sensitive values flowing from server-only
sources (env secrets, DB records, session/token data) into React Server
Component (RSC) boundaries:

1. into **client components** ("use client" files) via props/children;
2. **out of server modules** through exported values; and
3. into **external sinks** such as `console.log`.

The analyzer operates on TypeScript ASTs (`.ts`/`.tsx`) and needs no runtime
of the app being analyzed.

## 2. Threat model

In Next.js App Router, only the RSC **server** runtime can read secrets: env
vars, the database, and per-request data (`cookies()`, `headers()`). Client
components execute in the browser, so every non-`NEXT_PUBLIC_` value that
crosses into them, or is exported from a server module for client consumption,
is a data-leak/certifiability risk. The scanner flags the *flow*, not just the
source, so clean server rendering (`<p>{requestHeader.get(...)}</p>` on an
intrinsic host element) is not reported.

## 3. Terminology

| Term | Meaning |
| --- | --- |
| Source | Expression that produces sensitive data: `process.env.*`, sensitive-named identifiers/members, server-module imports, data-source calls, per-request data calls. |
| Tainted | An expression derived (transitively) from at least one source. |
| Propagation | How taint flows through statements and expressions (Section 5). |
| Server module | A file marked `"server-only"` import, importing `next/headers`/`next/cookies`/`next/server`, or importing a module matching `sources.serverModules` patterns; also files under paths like `lib/db`, `lib/server-*`. |
| Client boundary | A file starting with the `"use client"` directive. |
| Sink | A place where a tainted value leaves the server: client-component props, server-module exports, external sinks. |

## 4. Sources of taint

| Source | Default detection |
| --- | --- |
| Environment variables | `process.env.X` member access (all of `process.env` is a source base). |
| Sensitive identifiers | Identifier in value position matching `sources.sensitiveIdentifiers` (default: `token`, `password`, `passwd`, `secret`, `api[_-]?key`, `apikey`, `credential`, `private[_-]?key`, `access[_-]?token`, `session[_-]?id`, `authorization`, `bearer`, `auth[_-]?token`). |
| Sensitive member reads | Property read (`user.password`, `config.apiKey`, …) whose name matches `sources.sensitiveMembers` — even when the base object is not itself tainted. |
| Server-module imports | Any binding imported from a module matching `sources.serverModules` (default: `server-only`, `next/headers`, `next/cookies`, `next/server`, `@/server*`, paths containing `db`/`prisma`/`database`/`sql`/`server` segments). |
| Data-source calls | Call/tagged-template whose callee matches `sources.calls` (default: `db.*`, `prisma.*`, `pool.*`, `sql…`, `supabase.*`, `createClient…`). |
| Per-request data | `cookies()`, `headers()`, `draftMode()` in a file that imports `next/headers` or `next/cookies`. |

## 5. Propagation rules

Taint flows through (conservative, per-file, fixpoint over ≤ 6 passes):

- Variable declarations and assignments (`const x = src`, `x = tainted`,
  `x ??= tainted`, compound `+=`).
- Destructuring: `const { email } = user` with a tainted `user`;
  `const { password } = user` (sensitive member), `const [first] = arr`.
- Default parameter / binding initializers: `function f(token = process.env.T)`.
- Object/array literals, spread, template literals, `+`, `??`, `&&`, `||`,
  ternaries, parentheses, type assertions, unary expressions.
- Property/element reads on tainted bases (`obj.key`, `arr[0]`).
- Calls: result is tainted when the callee is tainted (e.g. a server-module
  binding like `getUser(...)`), when any argument is tainted, or when the
  callee matches data-source patterns.
- Functions: a declared/assigned function whose body returns a tainted value
  is itself tainted, so exports and later calls of it are caught.

## 6. Sinks and rules

| ruleId | Severity | Condition |
| --- | --- | --- |
| `rsc/client-boundary-prop` | error | A server file renders a locally-imported `"use client"` component with a tainted prop/child/spread. Intrinsic host elements (`<div>`, `<p>`) are never sinks. Client files are skipped (source shipped earlier). |
| `rsc/server-only-export` | error | A server module exports a tainted value (`export const`, `export function`/class whose declaration returns tainted data, `export { … }`, `export default`). |
| `rsc/external-sink` | warning | Tainted argument reaches a callee matching `externalSinks` (default `console.*`, `alert`, `postMessage`). |
| `rsc/client-imports-server` | error | A `"use client"` file imports a module matching `sources.serverModules`. |

Client-component resolution covers **relative imports** (`./card`),
tsconfig-style **path aliases** (`@/components/card`, see
[path-alias-resolution.md](path-alias-resolution.md)), and **member tags**
(`<Card.Header>`, `<Panel.Item>`, `<UI.Card.Body>`) whose leftmost
identifier is a client-component binding or namespace import — see
[member-jsx-components.md](member-jsx-components.md).

## 7. Configuration

Optional config file `.rscboundaryrc.json` or `rscboundary.config.json`,
located at the scan root or any ancestor:

```jsonc
{
  "sources": {
    "sensitiveIdentifiers": ["token", "secret"],
    "sensitiveMembers": ["token", "secret"],
    "calls": ["^db\\.", "^prisma\\."],
    "serverModules": ["^server-only$", "lib/server"]
  },
  "externalSinks": ["^console\\.log$", "^postMessage\\b"],
  "pathAliases": { "@/*": ["./*"], "@ui/*": ["./src/components/*"] },
  "exclude": ["test/e2e", "generated"],
  "suppress": [
    { "ruleId": "rsc/external-sink", "file": "shared/logger.ts" },
    { "file": "pages/api.ts", "line": 42 }
  ]
}
```

Arrays replace defaults entirely. `suppress` entries match a finding only when
*all* provided fields match (file substring, exact ruleId, message substring,
exact 1-based line). `pathAliases` maps tsconfig-style import aliases to
replacement paths and ships with the Next.js default `"@/*": ["./*"]`; see
[path-alias-resolution.md](path-alias-resolution.md).

## 8. CLI contract

```
rsc-boundary scan [path] [--json]
```

| Item | Contract |
| --- | --- |
| `path` | File or directory (default `.`). Hidden/build dirs are skipped: `node_modules`, `.next`, `.nuxt`, `coverage`, plus `exclude` entries. |
| `--json` | Findings as a JSON array on stdout. |
| Human output | One line per finding: `file:line:col  severity  ruleId  message`, then `tainted by: …`, then a summary line. |
| Exit codes | `0` no findings; `1` findings; `2` usage/runtime error. |

Finding JSON shape:

```json
{
  "file": "app/page.tsx",
  "line": 15,
  "column": 20,
  "severity": "error",
  "ruleId": "rsc/client-boundary-prop",
  "message": "Sensitive value flows into client component <Card> prop \"apiKey\"",
  "sources": ["process.env.SUPABASE_SESSION_ID"]
}
```

Exit code `1` on findings makes the scanner CI-gateable.

## 9. Programmatic API

`src/index.ts` exports `analyzeFiles(files, { config })`, `collectFiles(target,
config)`, `resolveRelativeImport`, `resolveImport`, `RULES`, and the config
model (`loadConfig`, `defaultConfig`, `mergeConfig`).

## 10. Verification evidence

- Fixture apps under `test/fixtures/` (leaky/clean/member-read) with
  intentional leak and clean layouts.
- `test/analyzer.test.ts` and `test/cli.test.ts` on `node:test` (11 tests).
- CI (`.github/workflows/ci.yml`): `npm ci` → build → test → lint.

## 11. Limitations and non-goals (this version)

- Member JSX components (`<Foo.Bar>`) are now supported — see
  [member-jsx-components.md](member-jsx-components.md) — re-export traversal
  (`export * from`, `export { x } from`, `export * as ns from` barrel
  chains) is supported — see [re-export-traversal.md](re-export-traversal.md)
  — and so are `await` / `satisfies` / shorthand-object passthroughs — see
  [await-satisfies-shorthand.md](await-satisfies-shorthand.md).
- Data sources are matched by name/call patterns, not by full type-aware
  dataflow across modules; false positives are expected and suppressible.
- No serializers/DTO suggestions, no fix/auto-rewrite, no Next.js API-route or
  middleware coverage.
