# Computed-key write taint

## Goal

Detect sensitive data exposed as property names by writes, complementing
[computed object-key literals](computed-object-key-taint.md):

```tsx
const record = {};
record[process.env.INTERNAL_VALUE] = "public";
return <Client data={record} />;
```

## Behavior

- For an element-access assignment target, evaluate the computed key using the
  existing taint evaluator and add its source reasons to the immediate receiver.
  The RHS need not be sensitive.
- Cover `=`, arithmetic, exponentiation, shift, bitwise, logical, and nullish
  assignment operators. Logical assignments are conservative: a possible write
  is enough, regardless of whether its condition holds at runtime.
- Preserve existing source provenance and monotonic fixpoint propagation through
  variables, spreads, boundary props, and external sinks. No new rule is added.
- Public-key writes, ordinary property writes with public values, computed reads,
  and comparisons do not introduce key-based receiver taint. Existing rules for
  sensitive RHS values and sensitive member reads are unchanged.

## Boundaries

This is whole-receiver taint keyed by the receiver's source text, consistent with
existing mutation tracking, not object identity or alias analysis. A write to
`holder.entry[key]` taints `holder.entry`, not automatically the enclosing
`holder`. Parenthesized/equivalent receiver spellings are not normalized.
Destructuring destinations, update operators (`++`/`--`), `delete`, and
`Object.defineProperty` are not covered. No per-property overwrite, control-flow,
serialization, or new cross-module analysis is introduced. Existing evaluator
limits and false-positive tradeoffs remain unchanged.

## Acceptance

`test/fixtures/computed-key-writes` must produce exactly 19 client-boundary
findings: all 16 assignment operators, an indirect key, a spread of a mutated
object, and an immediate nested receiver. Each finding must retain environment
source provenance. Public writes, ordinary writes, computed reads, and comparison
controls must remain clean. Analyzer and CLI regressions, the full suite, and lint
must pass; the built CLI must exit 1 with those 19 findings.
