# Milestone 2026-09-09 — Async/Await Taint Propagation

- **Status:** Implemented (landed to `main`)
- **Date:** 2026-09-09
- **Spec:** [docs/specs/async-await-taint-propagation.md](../specs/async-await-taint-propagation.md)

## Goal

Close the async blind spot of the taint analyzer. Next.js App Router pages
and data helpers are commonly `async`, but the core engine had no
`await`/`yield` case in its taint evaluator — so `const record = await
fetchSessionData(id)` evaluated to clean even when the synchronous
`fetchSessionData(id)` was tainted, and sensitive async data flowed into
client-component props unflagged. This milestone unwraps `await`/`yield`
transparently, so async Server Component flows are flagged exactly like
their synchronous equivalents.

## Scope

- `src/analyzer.ts` — two new cases in `taintReasonsWorker`
  (`AwaitExpression` unwraps to the inner expression; `YieldExpression`
  unwraps to its operand, contributing nothing when bare), recursing at
  `depth + 1` under the shared cap, adding no new reason strings.
- Fixture app + unit/CLI tests covering an async multi-hop server chain
  awaited into a neutrally named page binding and rendered into a client
  boundary, plus the async exporter finding.
- Spec + milestone docs; core-spec §5 propagation list updated.

## Deliverables

| Path | Purpose |
| --- | --- |
| `src/analyzer.ts` | `AwaitExpression` / `YieldExpression` cases in `taintReasonsWorker` |
| `test/fixtures/async-await/` | Async app: multi-hop awaited server chain into a client boundary |
| `test/analyzer.test.ts` | Awaited boundary-propagation + async exporter findings |
| `test/cli.test.ts` | End-to-end scan of the async-await fixture |
| `docs/specs/async-await-taint-propagation.md` | Behavior specification |

## Verification

- `npm run build` — clean `tsc` compile (strict).
- `npm test` — all prior tests plus 3 new tests pass (2 analyzer + 1 CLI).
- `npm run lint` — clean `eslint`.
- Smoke run: `node dist/cli.js scan test/fixtures/async-await` reports the
  client-boundary `title` flow (absent without the fix) and the
  `fetchSessionData` server-only export (exit 1).

## Out of scope (future milestones)

- Promise combinators (`Promise.all`, `.then` chains) stay on the existing
  call-expression rule; fulfillment-value unwrapping is not modeled.
- Settled-status narrowing (maybe-clean unions) stays conservative.
- `for await...of` element taint follows the existing (non-inferring)
  for-of behavior.
