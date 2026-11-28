# Indexed-lookup taint

Implemented taint propagation from a sensitive computed index when an indexed
lookup's receiver is clean.

- Covers object, array, and optional access, plus existing propagation through
  declarations, assignments, containers, templates, client props, and sinks.
- Preserves tracked-expression and receiver provenance precedence.
- Public lookups, including indices with discarded sensitive comma operands,
  remain clean.
- Conservatively models selection dependence, not the literal contents of the
  selected value. No new rules, configuration, dependencies, alias tracking,
  control-flow analysis, or cross-module dataflow.

**Acceptance:** With sensitive-name heuristics disabled, the regression expects
nine client-boundary findings, one external-sink finding, four clean boundary
controls, and one clean sink control.

**Verification:** Regression reproduced before implementation (two boundary
findings instead of nine). After implementation, `npm test` passed (43/43),
`npm run lint` and `git diff --check` passed.
