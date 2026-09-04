# Specification — Path Alias Resolution

- **Version:** 1.0
- **Status:** implemented (milestone 2026-09-04)
- **Product:** `rsc-boundary` — static data-leak analyzer for Next.js / React Server Components
- **Extends:** [core-taint-analysis.md](core-taint-analysis.md)

## 1. Overview

The core engine resolved only **relative** import specifiers (`./x`, `../x`)
when deciding whether an imported binding is a client component or a
server-only module. Next.js applications conventionally import through
`tsconfig.json` `paths` aliases — `@/components/card`, `@/lib/db` — so those
sources flowed to client boundaries unflagged. This specification defines
tsconfig-style alias resolution for every import the analyzer follows, driven
by a new `pathAliases` configuration field.

## 2. Configuration

`pathAliases` mirrors TypeScript's `paths` option: a map from an alias pattern
to one or more replacement path patterns.

```jsonc
{
  "pathAliases": {
    "@/*": ["./*"],                    // Next.js default: alias root -> project root
    "@components/*": ["./src/components/*"],
    "@lib": ["./src/lib/legacy.ts"]    // exact alias, no wildcard
  }
}
```

Semantics:

| Item | Rule |
| --- | --- |
| Default | `{ "@/*": ["./*"] }` — the `create-next-app` convention, where the alias root is the project root. |
| Overrides | Setting `pathAliases` replaces the default mapping entirely (arrays are replaced, never merged — same as every other config field). To keep `@/*` working alongside custom aliases, redeclare it. |
| Wildcard | A single `*` in the alias pattern captures the matching portion of the specifier; each `*` in the replacement path is substituted with that capture. Patterns without `*` match the specifier exactly. |
| Base directory | Replacement paths resolve against the **project root**: the directory containing the loaded config file, or the scan target root when no config file exists. |
| Resolution | After substitution the path is resolved with the same steps as relative imports: exact file, or `index.*` fallback across `.tsx/.ts/.jsx/.js/.mts/.cts`. Replacement paths are tried in order; the first file that exists wins. |
| Unresolved | Specifiers that match no alias, or that match an alias whose files do not exist, are left unresolved — the engine simply does not index them (no crash, no finding). |

## 3. Behavior

Wherever the core engine resolves an import specifier (client-component
indexing for `rsc/client-boundary-prop`, server-module binding taint, and
`rsc/client-imports-server`), it now uses the alias-aware resolver:

1. Specifiers starting with `.` use the existing relative resolution.
2. All other specifiers are matched against `pathAliases` (in object key
   order) with wildcard capture and substitution.
3. The resolved file participates in the cross-file client-component index
   and server-module detection exactly like a relative import.

No rule internals change: alias resolution is purely an import-resolution
concern.

## 4. Programmatic API

`resolveImport(fromFile, specifier, config, rootDir)` is exported from
`src/index.ts` alongside the existing `resolveRelativeImport`. It returns the
resolved absolute file path or `null`.

`analyzeFiles(files, { config, rootDir })` accepts an optional `rootDir`
(defaults to `process.cwd()`); the CLI always passes the project root.

## 5. Verification evidence

- `test/fixtures/aliases/` — app importing a client component
  (`@/components/card`) and a server module (`@/lib/server/session`) through
  the default `@/*` mapping; both the client-boundary and the server-only
  export rules fire on it.
- `test/fixtures/alias-config/` — app importing through a custom alias
  (`@ui/*` → `./components/*`) declared in its own `.rscboundaryrc.json`;
  `rsc-boundary scan` on the directory reports the leak.
- Unit tests on `resolveImport` for default and custom wildcard/exact aliases.
- 21 tests total in `npm test`; build and lint are clean.

## 6. Known limits

- Alias lookup is matched by object key order and stops at the first alias
  whose pattern matches, even if no file resolves; declare more specific
  aliases first if overlaps exist.
- Package-relative (node_modules) specifiers and `paths` values that point
  outside the project root are intentionally not followed.
- Multi-`*` and `exports`-field style resolution of the TypeScript compiler is
  not replicated; this covers the `paths` shapes Next.js uses.
