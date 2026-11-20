# Object method and getter return taint

## Goal

Close the gap between named functions and object-literal callables. Sensitive
values returned by a method or getter must not cross a client boundary,
server-module export, or external sink unnoticed.

## Behavior

- When evaluating an object literal, inspect method declarations and getter
  declarations for sensitive return expressions using the existing function
  return scanner.
- A sensitive return taints the enclosing object, as sensitive property values
  already do. Existing member and element reads, calls, aliases, nested objects,
  and stored results then propagate that taint without new rules or options.
- Include async methods under the existing conservative call-result model.
- Skip nested functions while scanning a method/getter: an uncalled nested
  function returning sensitive data must not alone taint a public outer return.
- Leave public-returning methods/getters clean. Do not scan setters as value
  producers. Preserve the existing computed-key handling and comma-expression
  rule: a discarded sensitive result does not taint a public final value.
- Reuse existing provenance behavior. Member reads can report the read itself
  rather than the underlying source; element reads and object exports retain
  the return-source reasons available to the evaluator.

## Acceptance

With sensitive identifier and member patterns disabled, `object-callable`
produces exactly seven client-boundary findings, one external-sink finding,
and two sensitive server-export findings. The client cases cover a method,
getter, async method, nested object, stored call result, inline object, and
bracket-access call. Clean controls cover public methods/getters, nested
uncalled functions/arrows, a setter, and a discarded result. The sink and
server exports also have public counterparts that must remain clean.

## Limits

This is the existing conservative, whole-object analysis, not property-specific
or execution-aware dataflow. A sensitive method/getter can taint unrelated
reads of the same object; conditional/unreachable returns may also taint it.
There is no new function-argument binding, sanitization, class/`this` analysis,
or cross-module function-body evaluation. Generator-yield handling and
function-valued property assignments are outside this milestone.
