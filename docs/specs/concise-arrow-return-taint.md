# Concise arrow return taint

## Goal

Treat the implicit return of a variable-bound concise arrow function like an
explicit return, so sensitive values cannot escape through its calls or exports.

## Behavior

- For an arrow with an expression body, evaluate that body with the existing
  taint evaluator. Retain the same three-reason provenance cap as explicit returns.
- Include async arrows, parenthesized and derived expressions, and object-literal
  results. Existing binding propagation covers aliases, stored call results,
  client props (including callable props), external sinks, and server exports.
- Keep public returns and comma expressions ending in public values clean.
  Do not scan uncalled nested functions as returns of their enclosing function.
- Preserve block-body arrow and ordinary function return scanning unchanged.

## Acceptance

With sensitive identifier and member heuristics disabled, the `concise-arrow`
fixture produces exactly eight client-boundary findings, one external-sink
finding, and two server-export findings. Every finding retains environment-source
provenance; aliases can retain a general `process.env` reason rather than the
specific member because of the existing provenance cap. Public, discarded-value,
and uncalled-nested-function controls produce no findings.

## Limits

This milestone fixes variable-bound concise arrows only; it does not introduce
general inline-function evaluation, argument binding, cross-module body analysis,
function-valued object-property analysis, or execution-aware dataflow. Async
results follow the existing conservative call-result model.
