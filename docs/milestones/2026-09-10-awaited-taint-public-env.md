# Milestone 2026-09-10 — Awaited Taint & Public Env Passthrough

- **Status:** Implemented (landed to `main`)
- **Date:** 2026-09-10
- **Spec:** [docs/specs/awaited-taint-public-env.md](../specs/awaited-taint-public-env.md)

## Goal

Fix the two wrong verdicts the taint engine returned on idiomatic Next.js App
Router code: `await`ed server data (`await getUser(1)`, `await
Promise.resolve(process.env.SECRET)`) lost its taint at the `await` keyword
and flowed into client components unflagged, while `NEXT_PUBLIC_*` env reads
— inlined into the client bundle by design — were flagged as leaks. This
milestone makes `await`/`yield` transparent taint passthroughs and treats
`NEXT_PUBLIC_*` reads as public, so awaited leaks report and public values
stay silent.

## Scope

- `src/analyzer.ts` — `AwaitExpression`/`YieldExpression` passthrough in
  `taintReasonsWorker`; `NEXT_PUBLIC_*` exemption for `process.env.X`
  property reads (direct and parenthesized) and `process.env["X"]` element
  reads; `bindNames`/`processPropertyAccess` guards so public provenance
  never taints a name or member expression.
- Fixture app + unit/CLI tests covering awaited server-call results,
  awaited secrets, direct/inline/bracket `NEXT_PUBLIC_*` forms, and a static
  prop that must stay silent.
- Spec + milestone docs; core-spec §11 and README status lines updated.

## Deliverables

| Path | Purpose |
| --- | --- |
| `src/analyzer.ts` | Await/yield passthrough, NEXT_PUBLIC_* public-env handling |
| `test/fixtures/async-public/` | Async page: awaited leaks report, public reads stay silent |
| `test/analyzer.test.ts` | Await taint + NEXT_PUBLIC_* silence tests |
| `test/cli.test.ts` | End-to-end scan of the async-public fixture |
| `docs/specs/awaited-taint-public-env.md` | Behavior specification |

## Verification

- `npm run build` — clean `tsc` compile (strict).
- `npm test` — all prior tests plus 3 new tests pass (2 analyzer + 1 CLI).
- `npm run lint` — clean `eslint`.
- Smoke run: `node dist/cli.js scan test/fixtures/async-public` reports the
  two awaited flows and stays silent on all `NEXT_PUBLIC_*` forms and the
  static prop (exit 1).

## Out of scope (future milestones)

- `NEXT_PUBLIC_*` detection is syntactic on `process.env` reads; env aliases
  (`const env = process.env`) still resolve through the generic base-taint
  path.
- Async-generator dataflow beyond `yield` passthrough is not modeled.
- Cross-module type-aware dataflow remains open; see the core
  specification's limitations.
