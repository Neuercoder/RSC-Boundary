# Arithmetic and bitwise expression-result taint

## Goal

Keep sensitive data visible when arithmetic or bitwise operations transform it.
Previously, these binary expressions lost taint even when an operand came from
an environment value, allowing transformed data to cross client boundaries.

## Behavior

- Binary subtraction, multiplication, division, remainder, exponentiation,
  left shift, signed/unsigned right shift, bitwise AND, OR, and XOR propagate
  taint from either operand: `-`, `*`, `/`, `%`, `**`, `<<`, `>>`,
  `>>>`, `&`, `|`, and `^`.
- Use the existing binary propagation policy: prefer the left operand's
  reasons when sensitive, otherwise use the right operand's reasons.
- Propagation composes with variables, nested expressions, object values,
  templates, client props, and external-sink arguments.
- Public operands remain clean. A comma expression that discards a sensitive
  arithmetic result still takes only its final operand's taint.
- This is conservative explicit-dataflow tracking: transformations are not
  sanitizers, even if a particular constant operand could erase information.

No new rule IDs, dependencies, options, or configuration are introduced.
Addition and existing logical/assignment operators keep their current behavior.

## Acceptance

Disable sensitive-name/member heuristics to isolate source-based propagation.
The regression fixture must produce exactly 25 client-boundary findings:
each of the eleven operators with a sensitive left and right operand, plus
variable-derived, object-nested, and interpolated results. All findings retain
environment-source provenance. Exactly one transformed external-sink argument
is flagged. Eleven public operator controls, a public nested object, a
discarded-result control, and a public sink remain clean.

## Limits

Compound arithmetic/bitwise assignment, comparison/equality operators,
control-flow inference, constant folding, alias tracking, and new cross-module
analysis are out of scope. Existing recursion limits and provenance truncation
remain unchanged.
