# Milestone 2026-09-12 — Await / Yield / Satisfies Propagation

- **Status:** Implemented (rebased onto `main` after 2026-09-13 await/satisfies/shorthand landed first)
- **Date:** 2026-09-12
- **Spec:** [docs/specs/await-expression-propagation.md](../specs/await-expression-propagation.md)

## Goal

Close the async-component blind spot of the taint evaluator. Next.js App
Router server components are `async` by convention
(`const user = await getUser(1)`), and the evaluator's switch had no case
for `await` — so every awaited value fell into the `default:` branch and
evaluated as clean, letting awaited env secrets, server-module calls, and
per-request data flow into client components, exports, and sinks unflagged.
This milestone adds the generator-`yield` unwrap to the inner expression
for taint purposes. (`await` and `satisfies` unwraps are specified under
2026-09-13 await/satisfies/shorthand, which landed on `main` first; this
milestone keeps only the `yield` delta plus merged fixture/test coverage.)

## Scope

- `src/analyzer.ts` — one new `taintReasonsWorker` case (`YieldExpression`
  with a bare-`yield`-is-clean guard), costing one recursion-depth level like
  the existing `as` / parentheses / unary / `await` handling. (`await` and
  `satisfies` cases already exist on `main` via 2026-09-13.)
- Merged `test/fixtures/await-taint/` fixture (both scenario sets), unit/CLI
  tests covering the companion await/satisfies/shorthand flows plus a new
  generator-`yield` sink probe, and a clean `await` control that stays
  silent.
- Spec + milestone docs; core-spec §11 plus README updated.

## Deliverables

| Path | Purpose |
| --- | --- |
| `src/analyzer.ts` | `await` / `yield` / `satisfies` unwrap in `taintReasonsWorker` |
| `test/fixtures/await-taint/` | Async server page + server libs awaiting secrets/calls |
| `test/analyzer.test.ts` | Awaited boundary + export findings (2 new tests) |
| `test/cli.test.ts` | End-to-end scan of the await-taint fixture (1 new test) |
| `docs/specs/await-expression-propagation.md` | Behavior specification |

## Verification

- `npm run build` — clean `tsc` compile (strict).
- `npm test` — all prior tests plus 3 new tests pass (2 analyzer + 1 CLI).
- `npm run lint` — clean `eslint`.
- Smoke runs: `node dist/cli.js scan test/fixtures/await-taint` reports the
  awaited boundary + export flows (exit 1);
  `node dist/cli.js scan test/fixtures/clean` stays clean (exit 0), proving
  awaiting a clean value introduces no false positives.

## Out of scope (future milestones)

- `for await...of` binding taint beyond the existing right-hand-side
  propagation.
- Type-aware `satisfies` narrowing (treated exactly like `as`).
- Cross-module type-aware dataflow remains open; see the core
  specification's limitations.
