# Specification — Delete Result Taint

- **Version:** 1.0
- **Status:** implemented (milestone 2026-11-27)
- **Product:** `rsc-boundary`

## Behavior

A runtime `delete expression` result retains the operand's sensitive-source
provenance. The boolean reports whether deletion succeeded, not the original
value, but can reveal information about a sensitive object or lookup. Treat
it conservatively as derived data, consistent with comparison and `typeof`
results; do not treat deletion as sanitization.

```tsx
const removed = delete process.env.INTERNAL_VALUE;
return <Client removed={removed} />; // rsc/client-boundary-prop
```

Apply the existing expression evaluator to the operand, including sensitive
bases and computed keys, optional access, stored results, aliases, wrappers,
nested objects, templates, and function returns. Existing client-boundary,
external-sink, and server-export rules and recursion limits remain unchanged.

## Boundaries and clean controls

- Deleting a public property, including an optional lookup, stays clean.
- `void (delete expression)` yields undefined and stays clean.
- A discarded comma operand does not taint the final result.
- Independently visited expressions inside an operand still receive their
  normal analysis; discarding a result does not suppress sink analysis.
- No object-shape modeling, deletion side-effect tracking, constant folding,
  or changes to source recognition are introduced.
- No dependencies, configuration options, or finding rules are added.

## Verification

The `delete-result-taint` fixture covers eight client props, one external
sink, and one server export, plus public and discarded-result controls.
Analyzer tests disable sensitive-name heuristics and require environment
provenance for every finding. The built CLI must emit exactly ten findings
and exit with code 1.
