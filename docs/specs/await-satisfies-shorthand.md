# Specification — Await / Satisfies / Shorthand Taint Passthrough

- **Version:** 1.0
- **Status:** implemented (milestone 2026-09-13)
- **Product:** `rsc-boundary` — static data-leak analyzer for Next.js / React Server Components
- **Extends:** [core-taint-analysis.md](core-taint-analysis.md)

## 1. Overview

Modern Next.js server code is `async` by default: pages and server helpers
`await` data-source calls, narrow server values with `satisfies`, and bundle
them into `{ shorthand }` objects before rendering. The core engine's taint
evaluator (`taintReasonsWorker` in `src/analyzer.ts`) had no cases for
`AwaitExpression`, `SatisfiesExpression`, or `ShorthandPropertyAssignment`,
so each of these transparent wrappers silently dropped the taint:

- `const value = await getSecret(1)` — `value` stayed clean even when
  `getSecret` was a tainted server-module call, so `<Card title={value} />`
  reported nothing.
- `const checked = raw satisfies string` — `checked` stayed clean even when
  `raw` was `process.env.API_SECRET`.
- `const box = { value }` — the object literal reported clean even when
  `value` was tainted, so downstream reads like `box.value` (a neutral
  member name on a tainted base) only survived by accident of naming, and
  spreads of `box` into client components stayed silent.

This specification closes that gap: all three shapes are pure taint
passthroughs — the wrapper contributes no sanitization, so the taint of the
inner expression is the taint of the whole.

## 2. Behavior

Taint evaluation gains three cases in `taintReasonsWorker`:

| Expression shape | Evaluation |
| --- | --- |
| `await expr` | Returns the taint reasons of `expr` (one level deeper, same depth budget). |
| `expr satisfies T` | Returns the taint reasons of `expr`. `satisfies` is a compile-time-only check; like `as`, it never sanitizes. |
| `{ name }` (shorthand) inside an object literal | Evaluates the binding `name` exactly as if it were a `name: name` initializer; a tainted binding taints the whole literal. |

Resolution rules:

1. `await` unwraps a single level per evaluation step; nested
   `await await …` resolves through recursion under the existing depth
   budget (max depth 24, unchanged).
2. `satisfies` is treated identically to the existing `as` / type-assertion
   / non-null cases: transparent, no new provenance text.
3. Shorthand evaluation reuses the existing identifier path (tracked taint,
   server bindings, re-export edges, sensitive names), so `{ getToken }`
   and `{ value }` behave exactly like `{ getToken: getToken }`.
4. No sink or rule logic changes: once the wrapper is transparent, variable
   binding (`const value = await …`), member reads (`box.value`), spreads,
   JSX props/children, and export checks all behave as they do for the
   unwrapped expression.

## 3. Message examples

```
app/page.tsx:9:7  error  rsc/client-boundary-prop  Sensitive value flows into client component <Card> prop "title"
    tainted by: import getToken from "../lib/secrets" (server module); result of call getToken(1); returns process.env
```

Provenance chains are unchanged — the wrapper adds no reason of its own,
so findings point at the underlying source (server-module call,
`process.env`, …) exactly as if the wrapper were absent.

## 4. Proof-of-concept fixtures

- `test/fixtures/await-taint/` — an async server page that:
  - narrows `process.env.API_SECRET` through `satisfies` (`checked`) and
    passes it to `<Card title={checked} />`;
  - awaits a `server-only` async helper (`value = await getToken(1)`) and
    passes it to `<Card title={value} />`;
  - wraps the awaited value in a shorthand object (`box = { value }`) and
    passes `box.value` to `<Card title={box.value} />`.
  - All bindings use neutral names (`checked`, `value`, `box`) so the
    findings prove passthrough rather than sensitive-name matching. All
    three flows report, plus the `server-only-export` finding for
    `getToken` itself.

## 5. Known limits

- `yield` / generator resumption is not modeled: `yield` suspends rather
  than unwraps, so treating it as passthrough would be unsound; it stays
  out of scope.
- `await` inside unexecuted closures is evaluated with the same
  fixpoint-local reasoning as every other expression — no async
  control-flow ordering is performed.
- Deeply nested `await` chains beyond the existing depth budget (24) still
  cut off, as before.
