# Milestone 2026-09-13 — Await / Satisfies / Shorthand Taint Passthrough

- **Status:** Implemented (landed to `main`)
- **Date:** 2026-09-13
- **Spec:** [docs/specs/await-satisfies-shorthand.md](../specs/await-satisfies-shorthand.md)

## Goal

Close the async-wrapper blind spot of the taint analyzer. Next.js server
code is `async` by default — pages `await` data-source calls, narrow server
values with `satisfies`, and bundle them into `{ shorthand }` objects before
rendering — and the core engine's taint evaluator had no cases for
`AwaitExpression`, `SatisfiesExpression`, or `ShorthandPropertyAssignment`,
so each transparent wrapper silently dropped the taint and the leak into the
client component went unflagged. This milestone makes all three shapes pure
taint passthroughs.

## Scope

- `src/analyzer.ts` — three new cases in `taintReasonsWorker`:
  `AwaitExpression` unwraps to its operand, `SatisfiesExpression` unwraps to
  its checked expression (exactly like the existing `as` /
  type-assertion / non-null cases), and `ShorthandPropertyAssignment`
  (`{ value }`) evaluates its binding name exactly like a
  `value: value` initializer, so a tainted binding taints the whole object
  literal.
- No rule, sink, config, or CLI changes: once the wrappers are transparent,
  variable binding, member reads (`box.value`), spreads, JSX props/children,
  and export checks behave as for the unwrapped expression, with unchanged
  provenance text (the wrapper adds no reason of its own).
- Fixture app + unit/CLI tests using only neutral binding names
  (`checked`, `value`, `box`, `loadValue`), so the findings prove
  passthrough rather than sensitive-name matching.
- Docs: spec + milestone; core-spec §11 and README updated.

## Deliverables

| Path | Purpose |
| --- | --- |
| `src/analyzer.ts` | `await` / `satisfies` / shorthand cases in `taintReasonsWorker` |
| `test/fixtures/await-taint/` | Async page: `satisfies`-narrowed env, awaited `server-only` helper, shorthand-boxed value — all three flow into `<Card title>` |
| `test/analyzer.test.ts` | `await` unwrapping + `satisfies`/shorthand transparency tests (line-pinned, provenance-checked) |
| `test/cli.test.ts` | End-to-end scan of the await-taint fixture (3 boundary findings, exit 1) |
| `docs/specs/await-satisfies-shorthand.md` | Behavior specification |

## Verification

- `npm run build` — clean `tsc` compile (strict).
- `npm test` — all prior tests plus 3 new tests pass (2 analyzer + 1 CLI; 30 total).
- `npm run lint` — clean `eslint`.
- Smoke run: `node dist/cli.js scan test/fixtures/await-taint` reports the
  three client-boundary flows plus the `server-only-export` finding for the
  async helper (exit 1).

## Out of scope (future milestones)

- `yield` / generator resumption is not modeled (`yield` suspends rather
  than unwraps; passthrough would be unsound).
- No async control-flow ordering: `await` inside unexecuted closures uses
  the same fixpoint-local reasoning as every other expression.
- Cross-module type-aware dataflow remains open; see the core
  specification's limitations.
