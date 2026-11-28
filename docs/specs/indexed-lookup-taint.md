# Indexed-lookup taint

## Goal

Preserve sensitive data dependencies in computed lookups such as
`values[process.env.INTERNAL_VALUE]`. Previously, a clean receiver hid a
sensitive index from client-boundary and external-sink checks.

## Behavior

- An element access keeps existing tracked-expression taint first, followed by
  receiver taint. When both are clean, it inherits the index expression's taint.
- Object, array, nested, and optional element accesses use the same behavior.
- Existing propagation carries results through variable declarations,
  assignments, containers, template substitutions, client props, and sinks.
- Direct lookups preserve index-source provenance. Derived bindings retain the
  analyzer's existing derived-value reasons.
- Public indices on public receivers remain clean. A discarded sensitive comma
  operand does not taint an otherwise public index.
- Sensitive receivers remain sensitive, including when the index is also
  sensitive; their existing provenance takes precedence.

This conservatively models value dependence, as the existing conditional
expression analysis does. It does not claim that every selected value contains
the index's bytes: even a table of public values may reveal information through
the selection. Optional access is analyzed regardless of runtime nullability.

No new rules, configuration, dependencies, or source-name heuristics are added.
Static bracket member names are not newly interpreted as sensitive member names.

## Acceptance

With sensitive identifier/member heuristics disabled, the fixture reports exactly
nine client-boundary findings: direct object, array, optional, variable-derived,
assignment-derived, nested, interpolated, sensitive-receiver, and both-sensitive
lookups. Direct object, array, and optional lookups retain the environment index
source. The both-sensitive lookup retains receiver provenance.

Exactly one external sink is reported with index provenance. Four public-result
boundary controls and one public sink remain unflagged.

## Limits

This is conservative expression-result propagation, not alias tracking,
control-flow feasibility, property-level value analysis, or cross-module dataflow.
Existing traversal order, monotonic binding tracking, and recursion limits remain.
