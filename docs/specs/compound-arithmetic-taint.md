# Arithmetic and bitwise compound-assignment taint

## Behavior

The analyzer propagates sensitive data through all arithmetic and bitwise
compound assignments: `+=`, `-=`, `*=`, `/=`, `%=`, `**=`, `<<=`,
`>>=`, `>>>=`, `&=`, `|=`, and `^=`.

- The expression result inherits taint from either operand, preferring the
  left operand's reasons when both are tainted, as ordinary binary operations do.
- A tainted right operand also taints the updated identifier, property-access,
  or element-access target for subsequent reads. Target tracking uses the
  existing `compound-assigned <expression>` provenance format.
- An already-tainted target remains tainted after an update with a public value.
- Assignment results compose through variables, object values, client-component
  props, and external-sink arguments.
- Public operands stay clean. A comma expression discarding a tainted
  assignment result remains clean when its final operand is public; the
  assignment still updates its target.

No new rules, options, dependencies, or configuration are introduced. Existing
plain, logical, and nullish assignments retain their behavior.

## Acceptance

The regression fixture exercises all twelve operators with tainted left
operands, tainted right operands, subsequent target reads, public operands,
and discarded results. It also checks stored property and element targets,
a nested object result, and a direct external-sink argument.

With sensitive-identifier and sensitive-member heuristics disabled, expect
exactly 39 client-boundary findings and one external-sink finding. Each
right-operand result and the external sink retain environment-source evidence.
Public and discarded-result props do not produce findings.

## Limits

This extends the existing conservative, per-file fixpoint analysis; it does
not add flow-sensitive taint removal, alias tracking, computed-key evaluation,
constant folding, control-flow inference, or cross-module type-aware dataflow.
Property and element targets continue to be tracked by source text.
