# Specification: Array mutation value taint

## Problem

`splice` and `fill` store values in existing arrays, but the collection
mutation model did not propagate those values into the receiver. A later
array read passed to a client component could therefore escape detection.

## Behavior

- For property-access calls to `splice`, inspect only arguments starting at
  position 3 (the inserted values), including later tainted insertions.
- For property-access calls to `fill`, inspect only argument 1 (the stored value).
- Merge the first tainted stored argument's reasons into the receiver using
  the existing mutation helper, supporting identifiers and property receivers.
- Do not taint the receiver from `splice` start/delete-count or `fill`
  start/end arguments, clean stored values, or missing stored arguments.
- Keep existing mutation methods unchanged. Non-mutating `toSpliced` does not
  taint its receiver; existing call-result argument propagation still applies.

## Acceptance

The `array-mutation` fixture produces exactly three client-prop findings:
identifier receivers for `splice` and `fill`, plus a property receiver.
Index-only taint, missing values, and a discarded `toSpliced` result stay clean.
Analyzer findings retain the environment-source provenance; the CLI returns
exit code 1 for the three leaks. Existing tests and lint continue to pass.

## Limits

Like existing collection handling, method recognition is name-based, not
type-aware; receiver aliases and computed method names are not modeled.
Taint remains monotonic and flow-insensitive: no attempt is made to prove
whether a mutation executes or an index range is empty. Argument selection
uses syntactic positions; dynamic spreads are not expanded. This changes
receiver mutation only, not the existing conservative call-result model.
