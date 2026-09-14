# Specification — Iteration / Collection Taint Propagation

- **Version:** 1.0
- **Status:** implemented (milestone 2026-09-14)
- **Product:** `rsc-boundary` — static data-leak analyzer for Next.js / React Server Components
- **Extends:** [core-taint-analysis.md](core-taint-analysis.md)

## 1. Overview

Next.js server code routinely moves sensitive values through loops and
collection helpers before rendering: `for (const row of rows)` over DB
results, `for (const key in config)` over secret-bearing objects, and
`rows.map((entry) => entry)` to shape data for client components.
Likewise, arrays/sets/maps are built up with mutating calls such as
`bucket.push(secret)` and read back later (`bucket[0]`,
`bucket.map(…)`).

The core engine bound taint through declarations, assignments,
destructuring, and plain calls, but had no model for any of these three
shapes, so each silently dropped the taint:

- `for (const item of rows)` — `item` stayed clean even when `rows` was
  an awaited `server-only` result, so `<Card title={item} />` (via an
  intermediate `current = item`) reported nothing.
- `rows.map((entry) => entry)` — `entry` stayed clean even when `rows`
  was tainted, so `<Card title={labels[0]} />` reported nothing.
- `bucket.push(process.env.API_SECRET)` — `bucket` stayed clean, so
  `<Card title={bucket[0]} />` reported nothing.

This specification closes that gap: loop variables inherit the taint of
the iterated expression, collection-callback element parameters inherit
the taint of the receiver, and mutating collection calls merge argument
taint into the receiver.

## 2. Behavior

### 2.1 Loop iteration (`for...of`, `for...in`)

`processForIteration` runs during the tree walk for every
`ForOfStatement` / `ForInStatement`:

| Loop target | Binding |
| --- | --- |
| `for (const item of rows)` / `for (let k in cfg)` | The declared name(s) bind through the existing `bindNames` path with the taint reasons of the iterated expression. A tainted sequence taints the loop variable; destructured targets (`for (const { password } of users)`) additionally catch sensitive members via the sensitive-member check inside `bindNames`, even when the sequence itself is unknown. |
| Assignment targets (`for (item of rows)`, `for (obj.field of rows)`) | The identifier / property / element target is tainted (`iterates …`) when the iterated expression is tainted. Untainted sequences bind nothing. |

### 2.2 Collection callbacks (`rows.map((entry) => …)`)

`bindCallbackParameters` runs both during the walk (`processCallLike`)
and during taint evaluation (`taintReasonsWorker`'s call case), because
intrinsic JSX parents (`<main>{rows.map(…)}</main>`) are never evaluated
as expressions (see §5):

| Call shape | Binding |
| --- | --- |
| `recv.method(…, (el) => …)` / `recv.method(…, function (el) { … })` where `recv` is tainted | The callback's **first** parameter (the element) binds through `bindNames` with the receiver's taint reasons. Index/array parameters stay clean. Destructured element parameters reuse the binding-element path. |
| Anything else (no property-access callee, no trailing function argument, clean receiver) | No binding. |

The rule is method-name-agnostic: it models the shared
element-callback convention (`map`, `forEach`, `filter`, `find`, `some`,
`every`, …) rather than enumerating method names.

### 2.3 Mutating collection calls (`bucket.push(secret)`)

`taintMutationReceiver` runs during the walk for call expressions whose
callee is a property access with a mutating method name:

| Method | Effect when an argument is tainted |
| --- | --- |
| `push`, `unshift`, `add`, `set`, `append`, `insert` | The receiver identifier (or receiver expression text for member bases) is tainted with the argument's reasons, so later reads (`bucket[0]`, `bucket.map(…)`) inherit the provenance. |
| All other methods (`map`, `filter`, `concat`, …) | Untouched — read-only transformers produce their result at the call site, which the existing call-result rule already covers. |

Only the first tainted argument is merged per walk visit; the fixpoint
(≤ 6 passes) accumulates the rest across passes.

## 3. Message examples

```
app/page.tsx:20:7  error  rsc/client-boundary-prop  Sensitive value flows into client component <Card> prop "title"
    tainted by: returns process.env, read rows.map
```

Provenance chains reuse existing reason text — `bindNames` reasons for
loop/callback bindings, `assigned …` for the `current = item` step,
`process.env` / `read process.env.API_SECRET` for direct env flows —
so findings point at the underlying source exactly as if the
loop/callback/mutation wrapper were absent.

## 4. Proof-of-concept fixtures

- `test/fixtures/iteration-taint/` — an async server page that:
  - maps an awaited `server-only` string array into `labels`
    (`rows.map((entry) => entry)`) and passes `labels[0]` to
    `<Card title>` (neutral names `rows`, `entry`, `labels` prove
    receiver-to-parameter binding, not sensitive-name matching);
  - copies the same array through `for (const item of rows)` into
    `current` and passes it to `<Card title>`;
  - copies an awaited `server-only` config object through
    `for (const field in cfg)` into `active` and passes it to
    `<Card title>`;
  - pushes `process.env.API_SECRET` into `bucket` and passes
    `bucket[0]` to `<Card title>`.
  - All four flows report, plus the two `server-only-export` findings
    for the `loadEntries` / `loadConfig` helpers themselves.

## 5. Known limits

- Only the callback's **first** parameter is bound. Index/array
  parameters (`rows.map((el, i, arr) => …)`) stay clean.
- Only the **last** argument is treated as the callback. Multi-callback
  APIs (`promise.then(onFulfilled, onRejected)`) bind just the trailing
  one.
- `for await (… of …)` is handled as plain `for…of` (the `await` unwrap
  from [await-satisfies-shorthand.md](await-satisfies-shorthand.md)
  applies to the iterated expression); no async-iteration ordering is
  modeled.
- Mutation modeling is name-based (`push|unshift|add|set|append|insert`)
  and receiver-identifier-scoped: aliased receivers (`const alias =
  bucket; alias.push(secret)`) do not propagate back to `bucket`.
- Loop/callback bodies inside unexecuted closures use the same
  fixpoint-local reasoning as every other expression — no control-flow
  ordering (e.g. `break`/`continue` sensitivity) is performed.
