# Specification — Process Environment Source Recognition

- **Version:** 1.0
- **Status:** implemented (milestone 2026-11-26)
- **Product:** `rsc-boundary`

## Behavior

Treat `process.env`, `process["env"]`, and a no-substitution template key
(``process[`env`]``) as the same sensitive source. Single-quoted literal keys
and optional element access follow the same rule. Propagate through subsequent
property/index reads, stored values, client props, external sinks, and server
exports using the analyzer's existing taint and provenance rules.

Do not classify unrelated process members (`process.version`, `process.platform`,
`process.arch`, or `process["versions"]`) as environment reads. They remain
eligible for ordinary configured source/member rules and tracked taint.

## Boundaries

No constant folding of dynamic keys, lexical resolution of shadowed `process`,
public-environment-variable exceptions, dependency changes, or configuration
changes. Discarded comma operands and `void` results remain clean. Existing
provenance may describe a tracked property read rather than repeat its root.

## Verification

With sensitive-name heuristics disabled, the regression fixture requires six
client-boundary findings, one external-sink finding, and one server-export
finding. Process metadata and discarded/void controls must not produce findings.
The built CLI must return the same eight findings and exit code 1.
