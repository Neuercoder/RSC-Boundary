# Milestone 2026-11-20 — Functional Return Taint Propagation

## Scope

Preserve sensitive return values from immediately invoked arrow/function
expressions and inline `.map()` / `.flatMap()` callbacks.

- Specification: [functional-return-taint.md](../specs/functional-return-taint.md)
- Regression fixture: `test/fixtures/functional-taint/`
- Covers concise/block/async functions, nested and parenthesized IIFEs,
  stored results, callbacks with `thisArg`, client props, sinks, and exports.
- Preserves public returns, discarded comma values, uncalled nested functions,
  and non-transform callbacks. No new dependencies or configuration.

## Verification

- Expanded regression failed before completion of the fix (ten rather than
  eleven client findings, with missing flows and an incorrect `thisArg` flow).
- `npm test`: passed (49/49, including build and test compilation).
- `npm run lint` and `git diff --check`: passed.
- Built CLI: eleven client-boundary findings, one external-sink finding, and
  one server-export finding (exit code 1 for findings).
