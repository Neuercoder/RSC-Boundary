# Specification — Typeof Result Taint

- **Version:** 1.0
- **Status:** implemented (milestone 2026-11-21)
- **Product:** `rsc-boundary`

## Behavior

A runtime `typeof expression` result retains the operand's sensitive-source
provenance. Although the result is a type string rather than the original
value, it reveals information about server data and is not treated as
sanitization. This matches the analyzer's conservative treatment of derived
expressions.

```tsx
const label = typeof process.env.INTERNAL_VALUE;
return <Client label={label} />; // rsc/client-boundary-prop
```

Apply this rule to direct and stored results, nested expressions, templates,
external sinks, and server-module exports. Reuse existing finding rules and
the expression evaluator's recursion budget. No dependencies, source
categories, or configuration options are added.

## Boundaries and clean controls

- Public operands and unresolved neutral identifiers stay clean.
- `void expression` yields undefined, not operand-derived data, and stays
  clean; `typeof (void expression)` stays clean too.
- A discarded comma operand does not taint the final value.
- Repeated `typeof` remains conservatively tainted; no constant folding,
  runtime type inference, or implicit control-flow tracking is introduced.
- TypeScript type-position `typeof` queries are not runtime expressions and
  are outside this milestone.
- Evaluating an operand can still produce independent findings, such as a
  sensitive argument passed to a sink inside a `void` expression.

## Verification

The `typeof-taint` fixture covers seven client props, one external sink,
and one server export, plus public, unresolved, void, and discarded-value
controls. Analyzer tests disable sensitive-name heuristics and require
process.env provenance for every finding. The built CLI must emit exactly
nine findings and exit with code 1.
