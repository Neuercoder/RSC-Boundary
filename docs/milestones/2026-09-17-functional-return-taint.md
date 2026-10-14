# Milestone 2026-09-17 — Functional Return Taint Propagation

- **Status:** Implemented
- **Date:** 2026-09-17
- **Spec:** [docs/specs/functional-return-taint.md](../specs/functional-return-taint.md)

## Goal

Close the functional return-value blind spot in the taint analyzer. Server
components frequently calculate props with an IIFE or build arrays with
`.map()` / `.flatMap()`. Previously, a sensitive value returned inside either
inline function disappeared from the expression evaluator, allowing it to
reach a client component undetected.

## Scope

- `src/analyzer.ts`
  - evaluates expression-bodied arrow functions as their returned expression;
  - propagates taint returned by direct arrow/function IIFEs;
  - propagates taint returned by inline callbacks supplied to `.map()` and
    `.flatMap()`.
- `test/fixtures/functional-taint/` — neutral-name fixture covering
  expression IIFE, block IIFE, `map`, and `flatMap`.
- Analyzer and CLI tests — require all four client-boundary findings.
- Documentation — this milestone, specification, core limitation summary, and
  README status/index.

## Non-goals

The milestone does not infer return contracts for identifiers, third-party
higher-order functions, or callback-taking methods whose callback result is
not their output (`forEach`, `filter`, `find`). It also does not add
cross-module, type-aware dataflow.

## Verification

- `npm test`
- `npm run lint`
- `node dist/cli.js scan test/fixtures/functional-taint`
