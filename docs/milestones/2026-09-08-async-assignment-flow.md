# Milestone 2026-09-08 — Async and Assignment-Operator Taint Flow

- **Status:** Implemented (unpushed)
- **Date:** 2026-09-08
- **Spec:** [docs/specs/async-assignment-flow.md](../specs/async-assignment-flow.md)

## Goal

Close the two largest remaining taint-propagation blind spots in the analyzer:
`await`/`yield` of sensitive calls (the standard async server-component
shape) evaluated to untainted, and logical assignments (`||=`, `&&=`)
silently dropped right-hand taint. Both let real leaks into client-component
props flow through unflagged — confirmed with neutral-name probes (e.g.
`await loadSessionRecord()` with non-sensitive identifiers reported zero
boundary findings before the fix).

## Scope

- `src/analyzer.ts` — `taintReasonsWorker` gains `AwaitExpression` /
  `YieldExpression` pass-through cases and a `SatisfiesExpression` case
  alongside the existing assertion handling; `processBinaryExpression`
  handles `||=` / `&&=` (plus element-access targets) with the existing
  `compound-assigned …` wording, gated on a tainted RHS.
- Fixture app + unit/CLI tests covering awaited sensitive calls, `||=` /
  `&&=` propagation, and a static-text prop that must stay silent.
- Spec + milestone docs; core-spec §5 propagation list, §11 limitation note,
  and README feature/status lines updated.

## Deliverables

| Path | Purpose |
| --- | --- |
| `src/analyzer.ts` | Await/yield/satisfies taint cases; logical-assignment handling |
| `test/fixtures/async-flow/` | Async server function + `await` / `||=` / `&&=` page leaking into `<Card>` |
| `test/analyzer.test.ts` | Await tracking + logical-assignment tracking tests |
| `test/cli.test.ts` | End-to-end scan of the async-flow fixture |
| `docs/specs/async-assignment-flow.md` | Behavior specification |

## Verification

- `npm run build` — clean `tsc` compile (strict).
- `npm test` — 30 tests passing (27 prior + 2 analyzer + 1 CLI).
- `npm run lint` — clean `eslint`.
- Smoke run: `node dist/cli.js scan test/fixtures/async-flow --json`
  reports the three boundary flows plus the server-only export (exit 1);
  `test/fixtures/clean` still reports none (exit 0).

## Out of scope (future milestones)

- `for await…of` destructuring, remaining compound bitwise/shift assignments
  (`&=`, `|=`, `-=`, …), and cross-module type-aware dataflow remain open;
  see the new spec's §5 and the core specification's limitations.
