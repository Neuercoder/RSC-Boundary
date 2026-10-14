# Specification — Generator Yield Expression Propagation

- **Version:** 1.1
- **Status:** implemented (milestone 2026-09-12; rebased onto 2026-09-13)
- **Product:** `rsc-boundary` — static data-leak analyzer for Next.js / React Server Components
- **Extends:** [core-taint-analysis.md](core-taint-analysis.md)
- **Companion:** [await-satisfies-shorthand.md](await-satisfies-shorthand.md)
  covers `await` / `satisfies` / shorthand-object passthroughs; this spec
  covers only the generator-`yield` delta that the companion does not.

## 1. Overview

The core engine's taint evaluator (`taintReasonsWorker` in
`src/analyzer.ts`) had no case for `yield`, so a tainted value behind
`yield` fell into the `default:` branch and evaluated as clean. This
specification closes that generator gap: `yield` expressions unwrap to
their inner expression for taint purposes. (`await` and `satisfies`
unwrap identically, but they are specified and tested under
[await-satisfies-shorthand.md](await-satisfies-shorthand.md) since
milestone 2026-09-13 landed first on `main`.)

## 2. Behavior

| Expression shape | Taint rule |
| --- | --- |
| `yield <expr>` / `yield* <expr>` / bare `yield` | Taint of `<expr>`; bare `yield` (no operand) is clean. |

Resolution rules:

1. Unwrapping is purely a taint-evaluation concern: no new sources, sinks,
   severities, message shapes, Finding fields, or exit-code behavior.
2. Existing propagation flows through the unwrap automatically:
   call arguments (`console.log(yield secret)`), variable initializers,
   assignments, JSX props/children, and exports.
3. Depth accounting follows the existing recursion guard (`depth > 24`
   returns clean): each unwrap costs one depth level, matching `as` /
   parentheses / unary / `await` handling.
4. `yield` of a clean value stays clean — no false positives are introduced.

## 3. Message examples

No new message shapes. Existing messages fire on `yield`-derived flows:

```
gen.ts:2:15  warning  rsc/external-sink  Sensitive value flows into external sink console.log(...)
```

## 4. Proof-of-concept fixtures

- Unit-level sink probes (see `test/analyzer.test.ts`, "yield unwraps to
  its operand and bare yield stays clean") cover a tainted
  `yield process.env.YIELD_SECRET` (flagged) and a bare `yield` (silent),
  without growing the shared `test/fixtures/await-taint/` fixture, which
  now belongs to the companion `await` / `satisfies` / shorthand spec.

## 5. Known limits

- Generator `return` / `yield*` delegation values are not modeled beyond
  the operand unwrap.
- `for await...of` iteration binding taint is not modeled beyond the
  initializer-based propagation the engine already performs on the
  right-hand side expression.
- Cross-module type-aware dataflow remains open; see the core
  specification's limitations.
