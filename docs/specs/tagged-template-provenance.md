# Tagged-template callable provenance

## Status

Implemented in the [2026-10-22 milestone](../milestones/2026-10-22-tagged-template-provenance.md).

## Behavior

A tagged template is a call to its tag. The result inherits taint from a
tainted tag even when the template has no substitutions (`render` followed
by a literal template). This includes imported server helpers, their local
aliases, member reads on tainted objects, and local functions with tainted
returns. Existing identifier/member/function analysis supplies the reasons;
no new rule or source category is introduced.

Evaluation retains the existing priority:

1. A tag matching configured `sources.calls` yields the existing tagged-template
   data-source reason.
2. Otherwise, a tainted tag supplies its existing provenance (up to three reasons).
3. Otherwise, template substitutions are inspected in order, as before.
4. A clean tag with no tainted substitutions remains clean.

Derived values reach the existing client-boundary, export, and external-sink
checks through ordinary taint propagation. This does not add new sink syntax:
a tagged invocation of an external sink is not separately treated as a sink.

## Limits

The analyzer remains conservative: tags are not executed, and sanitizing tags
are not modeled. This reuses the per-file monotonic fixpoint and recursion
budget; it does not introduce type-aware call resolution, property precision,
or parameter-sensitive return analysis.

## Regression coverage

`test/fixtures/tagged-template/` uses neutral names to cover imported, aliased,
member, and local-return tag provenance; existing substitution and configured
source propagation; clean templates with and without substitutions; and a
result passed to `console.log`. Analyzer and CLI tests require six boundary
findings and one external-sink finding, with clean props absent.
