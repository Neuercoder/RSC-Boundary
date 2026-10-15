# Destructuring Assignment Taint

## Goal

Track sensitive values copied into existing variables or members through object
and array destructuring assignments, not just declaration binding patterns.

## Behavior

- Plain `=` assignments with object or array patterns distribute RHS taint to
  every target. TypeScript represents these patterns as object/array literal
  expressions, not `ObjectBindingPattern` / `ArrayBindingPattern` nodes.
- Supported targets are identifiers, property accesses, and element accesses.
  Assignment keys keep the analyzer's existing exact-source-text semantics.
- Recursively visit nested object/array patterns, renamed object properties,
  shorthand properties, and object/array rest targets. Skip array holes.
- Merge taint from default initializers into their target, even when the RHS
  itself is clean. Defaults include `[value = source]`, `{ key: value = source }`,
  and `{ value = source }` forms.
- Preserve source provenance from the RHS/default. Use the existing monotonic
  file-local fixpoint, including propagation through later assignments.
- Clean RHS values and clean defaults introduce no taint. A tainted element
  target does not taint a sibling index or its receiver.
- Ordinary assignments, logical/compound assignments, declaration bindings,
  assignment-expression results, rule IDs, configuration, and CLI contracts
  are unchanged.

```tsx
let value = "";
let fallback = "";
({ entry: value } = { entry: process.env.API_SECRET });
[fallback = process.env.API_SECRET] = [];
return <Card title={value + fallback} />; // client-boundary finding
```

## Limits

This is conservative aggregate propagation, not field/position-sensitive
selection: any taint on the RHS reaches all targets, including rest targets.
Defaults are considered possible sources without checking whether a value is
actually missing. Clean overwrites do not clear existing taint. Computed keys
are not evaluated to select fields or introduce new sensitive-member sources;
this milestone only propagates existing RHS/default taint. Alias identity,
control-flow feasibility, and cross-module type-aware dataflow remain out of
scope. The existing fixpoint pass limit still applies.

## Acceptance checks

- Analyzer fixture covers renamed and nested object/array targets, member and
  indexed targets, rest elements, holes, defaults, and multi-pass propagation.
- Sensitive-name matching is disabled in analyzer regressions to prove actual
  dataflow; source provenance is asserted for RHS propagation.
- Exact boundary-finding assertions protect clean assignments/defaults and a
  sibling array index from false positives.
- CLI regression expects exit 1 and the same eleven client-boundary findings.
