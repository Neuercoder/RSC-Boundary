# Specification — Constructor Source Taint

- **Version:** 1.0
- **Status:** implemented (milestone 2026-11-28)
- **Product:** `rsc-boundary`

## Behavior

Treat a `new` expression as a data source when its constructor text matches
a configured `sources.calls` regular expression, just as ordinary calls and
tagged templates already do. Use existing default patterns when no override
is configured. This closes the gap where a configured source could evade
analysis simply by being invoked as a constructor.

For example, with `"calls": ["^Vault$"]`:

```tsx
const value = new Vault();
return <Client value={value} />; // rsc/client-boundary-prop
```

- Support constructors with arguments, empty arguments, or no parentheses.
- Match identifier and member constructors using their existing textual form.
- Retain existing precedence: sensitive arguments first, sensitive callee
  provenance next, configured-source recognition last.
- Configured constructor provenance is `new <callee> (data source)`.
- Existing propagation handles stored results, wrappers, nested objects,
  templates, and returned values.
- Apply existing client-boundary, external-sink, and server-export rules.

## Boundaries

Public constructors remain clean unless their arguments or callee are
independently sensitive. Void results and discarded comma operands remain
clean. Constructor invocation alone must not trigger the special per-request
recognition for `cookies()`, `headers()`, or `draftMode()`; those remain calls.

This is conservative result tracking, not constructor-body, instance-field,
or class/`this` modeling. No new dependencies, rule IDs, configuration fields,
or cross-module analysis are introduced.

## Verification

With identifier/member heuristics disabled, the `constructor-source-taint`
fixture produces ten client-boundary findings, one external-sink finding,
and one server-export finding. Checks assert constructor-source provenance
and retained environment-argument provenance. A separate analyzer regression
checks default source patterns without loading the fixture configuration.
The built CLI loads that configuration and emits exactly twelve findings
with exit code 1. Public, discarded, and per-request-constructor controls
must not produce findings.
