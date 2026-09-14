# Specification — Async/Await Taint Propagation

- **Version:** 1.0
- **Status:** implemented (milestone 2026-09-09)
- **Product:** `rsc-boundary` — static data-leak analyzer for Next.js / React Server Components
- **Extends:** [core-taint-analysis.md](core-taint-analysis.md)

## 1. Overview

Next.js App Router pages and data-fetching helpers are commonly `async`:
a Server Component awaits a server function (`const record = await
fetchSessionData(id)`) and renders the result into a client component.
The core engine unwrapped transparent expression forms (parentheses, `as`
casts, unary operators) but had no case for `await`/`yield`, so an awaited
tainted call evaluated to clean. This specification closes that gap:
`await expr` carries the taint of `expr`, and `yield expr` carries the taint
of its operand, so async Server Component data flows are flagged exactly
like their synchronous equivalents.

## 2. Behavior

| Expression shape | Taint |
| --- | --- |
| `await expr` (`AwaitExpression`) | Taint reasons of `expr` (recursively evaluated), sliced to 3 like every other transparent wrapper. |
| `yield expr` (`YieldExpression`) | Taint reasons of the operand; bare `yield` (no operand) contributes nothing. |
| Chained/nested awaits (`await (await f())`, `await g(await h())`) | Each layer unwraps recursively within the existing depth cap (24). |
| `await` in any sink position | Flows through the normal sinks unchanged: `await` appears in variable initializers (`const record = await f()`), return statements, export declarations, call arguments, and JSX prop expressions — all evaluated by the same `taintReasons` entry point. |

Resolution rules:

1. `await`/`yield` add no new sources: they only propagate the inner
   expression's reasons. A clean promise (`await fetch("/api/public")`)
   stays clean.
2. Async-function taint is unchanged: a function whose body returns a
   tainted value (awaited or not) is itself tainted
   (`returns <first reason>`), so `export async function` declarations and
   async arrow functions assigned to variables are flagged by the existing
   `functionReturnsTainted` walk — whose `return` expressions now evaluate
   through the new `await` case.
3. No message shapes change: findings keep the existing rule severities,
   wording, and the 3-reason cap. `await` contributes no reason string of
   its own; provenance reads exactly as the synchronous flow would.
4. Depth accounting matches the other wrappers: each unwrap recurses at
   `depth + 1` under the shared cap of 24.

No rule internals change beyond resolution: severities, message shapes,
Finding shape, and the exit-code contract (0 clean / 1 findings / 2
usage-error) are unchanged.

## 3. Message examples

```
// test/fixtures/async-await/app/page.tsx
app/page.tsx:10:7  error  rsc/client-boundary-prop  Sensitive value flows into client component <Card> prop "title"

// test/fixtures/async-await/lib/session-store.ts
lib/session-store.ts:6:1  error  rsc/server-only-export  Server module exports sensitive function "fetchSessionData"
```

## 4. Proof-of-concept fixtures

- `test/fixtures/async-await/` — `lib/session-store.ts` (a `server-only`
  module with an async multi-hop chain: `fetchSessionData` awaits
  `lookupSession` awaits `querySessions`, ending in
  `process.env.SESSION_ID`); `app/page.tsx` (`export default async
  function Page` awaiting the helper into a neutrally named `record` and
  rendering `<Card title={record.id} />`). The variable is deliberately
  named `record` (matching no sensitive-identifier pattern) so the
  boundary finding proves true propagation through `await`. Without the
  fix the page reports nothing; with it, both the boundary prop and the
  `fetchSessionData` export findings report.

## 5. Known limits

- Promise combinators are not modeled: `Promise.all([tainted])`,
  `Promise.race(...)`, and `.then((v) => ...)` return values are evaluated
  by the existing call-expression rule (tainted only when the callee or an
  argument position resolves tainted), not by unwrapping the fulfillment
  value.
- Settled-status narrowing is not performed: `await` on a union that may
  resolve clean still taints conservatively when any branch is tainted.
- `for await (... of ...)` iteration taint follows the existing
  for-of behavior (no element taint is inferred from the iterated
  expression), consistent with synchronous `for...of` handling.
