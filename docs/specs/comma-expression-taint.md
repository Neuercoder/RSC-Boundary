# Comma-expression result taint

## Goal

Preserve sensitive data returned by a JavaScript comma expression. Previously,
`(prepare(), process.env.INTERNAL_VALUE)` lost its source when evaluated as a
whole, allowing a client prop or external-sink argument to appear clean.

## Behavior

- A comma expression takes its value and taint reasons from its right operand.
- Chained and nested comma expressions recursively use the final result.
- Existing propagation applies to variable initializers, object values, template
  substitutions, client props, and external-sink arguments.
- Inline results preserve the final operand's source provenance; variable
  bindings continue to use the analyzer's existing derived-value reasons.
- A sensitive discarded operand does not taint a public result:
  `(process.env.INTERNAL_VALUE, "public")` is clean as a value.
- AST traversal still visits both operands. Assignment and sink side effects
  retain their existing behavior; discarding a value does not suppress a sink.

No new rules, configuration, or dependencies are introduced. Commas separating
arguments, array items, or declarations are not comma operators and are unchanged.

## Acceptance

With sensitive-name heuristics disabled, `test/fixtures/comma-expression/` must report exactly five
client-boundary findings (direct, chained, variable-derived, object-nested, and
interpolated results) and one external sink. Four public-result boundary
controls and a public-result sink must remain unflagged. Direct results and the
sink must retain environment-source provenance.

Additional regression coverage in `test/fixtures/comma-taint/` checks earlier
assignment effects followed by public results, nested sequences, and discarded
values. With sensitive-name heuristics disabled, it must report exactly four
client-boundary findings and one external sink. The CLI regression requires
exit code `1` and exactly five findings for this fixture.

## Limits

This is expression-result propagation, not control-flow, alias, or cross-module
analysis. Existing traversal order, recursion limits, conservative binding
tracking, and name-based heuristics remain unchanged.
