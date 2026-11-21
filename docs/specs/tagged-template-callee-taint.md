# Tagged-template callee taint

## Goal

Treat a tagged template's tag as a callee, as for ordinary calls. Results
from a sensitive tag must not cross a client boundary or external sink
undetected merely because the template contains only public text.

## Behavior

- Preserve configured source-call matching for tags and its existing provenance.
- Preserve propagation from template interpolations, with interpolation
  provenance taking precedence over tag provenance when both are sensitive.
- Otherwise evaluate the tag with the existing expression taint evaluator.
  This covers server-module imports, functions returning sensitive values,
  aliases, property access, and element access without new heuristics.
- Apply this to templates with and without interpolations.
- Propagate results through stored variables and object values as usual.
- Leave public tags with public templates clean. A discarded tagged result
  must not taint a public final comma-expression value.

## Acceptance

With sensitive identifier/member patterns disabled, the `tagged-callee`
fixture produces exactly nine client-boundary findings and one external-sink
finding. Coverage includes imported and local tags, property/element tags,
stored and nested results, existing interpolation/configured sources, and
three clean controls. Imported and local tags retain their original sources.

## Limits

This uses the analyzer's existing conservative call-result model. It does
not execute tags, model sanitization, introduce rules or options, or add
cross-module function-body analysis. Findings for sensitive tags are expected
even if their runtime implementation could return a public constant.
