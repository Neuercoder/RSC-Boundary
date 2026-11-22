# Specification — Comparison Result Taint

- **Version:** 1.0
- **Status:** implemented (milestone 2026-11-22)
- **Product:** `rsc-boundary`

## Behavior

Comparison results retain sensitive-source provenance from either operand.
A boolean can reveal information about server data; comparison is not
sanitization, consistent with the analyzer's conservative treatment of
derived expressions.

Supported operators: `==`, `!=`, `===`, `!==`, `<`, `<=`, `>`, `>=`,
`in`, and `instanceof`.

```tsx
const enabled = process.env.INTERNAL_VALUE === "enabled";
return <Client enabled={enabled} />; // rsc/client-boundary-prop
```

Apply the same propagation to stored, wrapped, nested, template, repeated,
and logically composed results, external sinks, and server-module exports.
Reuse the existing finding rules, provenance limits, and recursion budget.
No dependencies, configuration options, or source categories are added.

## Boundaries and clean controls

- Comparisons with public operands stay clean.
- Both left and right operand sources are recognized independently; the
  existing evaluator reports the first tainted operand's provenance.
- A discarded comma operand does not taint the final value.
- `void` results remain clean, including when used in comparisons.
- No constant folding, type inference, runtime operand validation, or new
  statement-level implicit control-flow tracking is introduced.
- TypeScript type-position operators are outside this milestone.
- Existing assignment and arithmetic behavior is unchanged.

## Verification

The `comparison-taint` fixture covers all ten operators with a source in
each operand position, six composed/stored results, one external sink, and
one server export. Public comparisons for every operator, a discarded
comparison, a void result, and a public typeof comparison stay clean.
Fixtures are parsed, not executed or typechecked; operand combinations test
conservative syntactic tracking rather than JavaScript runtime validity.

Analyzer tests disable sensitive-name heuristics and require process.env
provenance for all 28 findings. The built CLI must emit exactly 26 client
boundary findings, one sink finding, and one export finding, exiting with
code 1.
