# Function-valued object-property return taint

## Goal

Close the gap between object methods and function-valued properties such as
`{ read: () => process.env.INTERNAL_VALUE }`.

## Behavior

- When evaluating an object literal, inspect arrow-function and function-expression
  property initializers with the existing return scanner. Unwrap parentheses.
- Include concise, block-body, ordinary, async, and nested object properties.
- Taint the containing object when a property function returns sensitive data,
  following the existing conservative whole-object model for methods/getters.
- Existing propagation then covers member and element calls, stored results,
  callable props, inline objects, external sinks, and server-only exports.
- Preserve public return values, discarded comma-expression values, and uncalled
  nested-function isolation. Keep the existing three-reason provenance cap;
  member reads may report the read expression rather than its environment source.

## Acceptance

With sensitive identifier/member heuristics disabled, `property-callable` produces
exactly ten client-boundary findings, one external-sink finding, and two
server-export findings. Public, discarded-value, and nested-function controls stay
clean. Findings retain provenance, including environment-source reasons for
bracket access and server exports.

## Limits

No argument binding, general inline-function invocation, class-method analysis,
member-specific object precision, cross-module body analysis, or execution-aware
model is introduced. Type assertions around property functions are not unwrapped.
Async results follow the existing conservative call-result model. No new options
or dependencies are required.
