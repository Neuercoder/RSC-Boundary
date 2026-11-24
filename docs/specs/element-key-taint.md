# Specification — Element Access Key Taint

- **Version:** 1.0
- **Status:** implemented (milestone 2026-11-24)
- **Product:** `rsc-boundary`

## Behavior

An element-access result retains sensitive-source provenance from its
computed key, even when the object or array contains only public values.
The selected value can disclose the key; selection is not sanitization.

```tsx
const labels = { first: "one", second: "two" };
const selected = labels[process.env.INTERNAL_VALUE];
return <Client selected={selected} />; // rsc/client-boundary-prop
```

Apply this rule to object and array lookups, optional element access,
stored and aliased keys, wrapped and derived keys, nested accesses,
templates, repeated reads, and local function returns. Existing external
sinks and server exports receive the same provenance.

Keep existing precedence: use tracked access provenance first, then the
base's provenance, then the key's. Reuse existing recursion and provenance
limits; no dependencies, source categories, or configuration changes.

## Boundaries and clean controls

- Public literal and dynamic keys on public bases remain clean.
- Discarded comma operands and `void` keys do not taint the selected value.
- A discarded or `void` lookup result does not taint the enclosing result.
- Existing tainted-base tracking remains unchanged.
- Optional lookups are conservative; do not infer nullishness, key
  existence, value equality, or runtime validity.
- No type-aware resolution, statement-level implicit-flow analysis,
  write-target/key alias propagation, or broader property-read changes.

## Verification

The `element-key-taint` fixture requires 12 client-boundary findings,
one external-sink finding, and one server-export finding, with no findings
for eight clean controls. Analyzer tests disable sensitive-name heuristics
and require `process.env` provenance for all 14 findings. The built CLI
must report the same counts and exit 1.
