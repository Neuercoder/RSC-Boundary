# Specification — Direct Collection-Alias Mutation Taint

- **Version:** 1.0
- **Status:** implemented (milestone 2026-09-16)
- **Product:** `rsc-boundary` — static data-leak analyzer for Next.js / React Server Components
- **Extends:** [iteration-collection-taint.md](iteration-collection-taint.md)

## 1. Overview

Collection mutation taint must follow the collection, not merely the spelling
of the receiver. A direct immutable alias previously dropped that relationship:

```tsx
const bucket: string[] = [];
const alias = bucket;
alias.push(process.env.API_SECRET);
return <Card title={bucket[0]} />; // now reported
```

This milestone extends the existing supported mutation methods so a direct
`const` identifier alias shares the receiver's taint with its source and other
direct aliases.

## 2. Behavior

The analyzer records aliases only for declarations in this exact family:

```ts
const alias = bucket;
const anotherAlias = alias;
```

These names form a transitive, per-file alias group. When a supported mutating
method (`push`, `unshift`, `add`, `set`, `append`, or `insert`) receives a
tainted argument through any name in that group, the existing source reasons
are copied to every group member. Consequently, reads through either the
original binding or an alias propagate to existing sinks such as client
component props.

## 3. Deliberate limits

This is a narrow, syntactic alias model. It does **not** cover mutable or
reassigned aliases, property/element or destructured aliases, aliases through
function arguments/returns/closures/modules, or type-aware reference analysis.
Read-only collection operations remain non-mutating and do not create alias
taint.

## 4. Verification fixture

`test/fixtures/collection-alias-taint/` demonstrates mutation through an
alias followed by an original read, mutation through an original followed by
an alias read, and a transitive alias chain. Its neutral collection names and
tests with sensitive-name matching disabled prove each finding comes from
alias propagation rather than identifier heuristics. A safe mutation remains
unreported.
