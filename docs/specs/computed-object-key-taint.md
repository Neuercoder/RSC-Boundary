# Computed object-key taint

## Goal

Detect sensitive values used as computed keys in object literals, even when the
associated value is public. Object keys can expose data just as values can:

```tsx
const record = { [process.env.INTERNAL_VALUE]: "public" };
return <Client data={record} />;
```

## Behavior

- Before inspecting a literal property's value, inspect its computed name's
  expression using the existing taint evaluator.
- A tainted computed name taints the entire object. Preserve the key's existing
  source reasons, subject to the evaluator's existing depth and reason limits.
- Cover property assignments, methods, getters, and setters. Only evaluate the
  computed name here; do not treat a method/accessor body as an object value.
- Reuse existing propagation through variables, nested objects, and spreads.
  Inline object literals at client boundaries receive the same treatment.
- Public computed names and ordinary property names do not introduce taint.
  In particular, `{ secret: "public" }` remains clean merely as an object value.
  Existing rules for subsequent sensitive member reads remain unchanged.

## Boundaries

This is conservative whole-object taint, not per-property tracking. Symbol keys,
non-enumerability, overwrite feasibility, and runtime serialization are not
modeled. Computed-key writes (`record[key] = value`), class member names, and
computed destructuring reads are outside this milestone. No new rules, options,
CLI output formats, dependencies, or cross-module dataflow are introduced.

## Acceptance

The fixture `test/fixtures/computed-object-keys` must report exactly eight
client-boundary findings: direct and indirect computed names, nested objects,
spreads, method/getter/setter names, and an inline literal. Three public controls
must remain unflagged. Direct-key findings must retain environment-source
provenance. Analyzer and CLI regressions must pass with the full test suite and
lint checks.
