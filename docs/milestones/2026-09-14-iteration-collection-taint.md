# Milestone 2026-09-14 — Iteration / Collection Taint Propagation

- **Status:** Implemented (landed to `main`)
- **Date:** 2026-09-14
- **Spec:** [docs/specs/iteration-collection-taint.md](../specs/iteration-collection-taint.md)

## Goal

Close the loop-and-collection blind spot of the taint analyzer. Server
code routinely moves sensitive values through `for (const row of rows)`
over DB results, `for (const key in config)` over secret-bearing
objects, and `rows.map((entry) => entry)` shaping before rendering —
and builds up arrays/sets/maps with mutating calls like
`bucket.push(secret)` read back later (`bucket[0]`,
`bucket.map(…)`). The engine bound taint through declarations,
assignments, destructuring, and plain calls but had no model for any of
these three shapes, so each silently dropped the taint and the leak
into the client component went unflagged. This milestone gives loop
variables the taint of the iterated expression, collection-callback
element parameters the taint of the receiver, and mutating-call
receivers the taint of their arguments.

## Scope

- `src/analyzer.ts` — three new helpers plus wiring:
  - `processForIteration` (walk dispatch for `ForOfStatement` /
    `ForInStatement`): binds declared loop variables through the
    existing `bindNames` path with the iterated expression's reasons
    (tainted sequence taints the variable; destructured sensitive
    members catch even on unknown sequences); taints assignment
    targets (`for (item of rows)`) when the sequence is tainted.
  - `bindCallbackParameters` (called from both `processCallLike`
    during the walk and `taintReasonsWorker`'s call case during
    evaluation): when the receiver of a property-access call is
    tainted and the trailing argument is an arrow/function
    expression, binds its first (element) parameter through
    `bindNames`. The walk-side call matters because intrinsic JSX
    parents (`<main>{rows.map(…)}</main>`) are never evaluated as
    expressions, so evaluation-side binding alone never fires there.
  - `taintMutationReceiver` (called from `processCallLike`): for
    `push` / `unshift` / `add` / `set` / `append` / `insert`, taints
    the receiver when an argument is tainted, so later reads
    (`bucket[0]`, `bucket.map(…)`) inherit the provenance.
    Read-only transformers (`map`, `filter`, `concat`) are excluded;
    their result is handled at the call site.
- No rule, sink, config, or CLI changes: once bound, loop variables,
  element parameters, and mutated receivers flow through variable
  binding, member/element reads, spreads, JSX props/children, and
  export checks exactly like any other tainted value, with reused
  (not new) provenance text.
- Fixture app + unit/CLI tests using only neutral binding names
  (`rows`, `entry`, `labels`, `item`, `current`, `field`, `active`,
  `bucket`), so the findings prove propagation rather than
  sensitive-name matching (analyzer tests additionally clear
  `sensitiveIdentifiers`/`sensitiveMembers`).
- Docs: spec + milestone; core-spec §11 and README updated.

## Deliverables

| Path | Purpose |
| --- | --- |
| `src/analyzer.ts` | `processForIteration` + walk dispatch; `bindCallbackParameters` + `taintMutationReceiver` in `processCallLike` and the call-evaluation case |
| `test/fixtures/iteration-taint/` | Async page: `.map` element binding, `for…of` copy, `for…in` copy, `.push` mutation — all four flow into `<Card title>` |
| `test/analyzer.test.ts` | Callback-receiver, for-of/for-in, and mutation-receiver tests (line-pinned, provenance-checked; two with sensitive-name matching disabled) |
| `test/cli.test.ts` | End-to-end scan of the iteration-taint fixture (4 boundary findings, exit 1) |
| `docs/specs/iteration-collection-taint.md` | Behavior specification |

## Verification

- `npm run build` — clean `tsc` compile (strict).
- `npm test` — all prior tests plus 4 new tests pass (3 analyzer + 1 CLI; 34 total).
- `npm run lint` — clean `eslint`.
- Smoke run: `node dist/cli.js scan test/fixtures/iteration-taint` reports the
  four client-boundary flows plus the two `server-only-export` findings for the
  `loadEntries` / `loadConfig` helpers (exit 1).

## Out of scope (future milestones)

- Only the callback's first (element) parameter is bound; index/array
  parameters stay clean. Only the trailing argument is treated as the
  callback.
- `for await (… of …)` is plain `for…of` plus the existing `await`
  unwrap; no async-iteration ordering.
- Mutation modeling is name-based and receiver-identifier-scoped:
  aliased receivers (`const alias = bucket; alias.push(secret)`) do not
  propagate back.
- No `break`/`continue`-sensitive control-flow ordering; closures use
  the same fixpoint-local reasoning as every other expression.
- Cross-module type-aware dataflow remains open; see the core
  specification's limitations.
