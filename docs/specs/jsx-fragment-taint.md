# JSX-fragment taint propagation

## Goal

Prevent JSX fragments from hiding sensitive rendered values at a local
`"use client"` boundary. Both `<Client content={<>{value}</>} />` and
`<Client><>{value}</></Client>` must preserve taint from `value`.

## Behavior

- A fragment is tainted when one of its expression children or nested fragments
  is tainted. Use the existing recursive taint evaluator, depth limit, source
  provenance, and whole-value propagation.
- Fragments work inline, in variables, inside arrays/objects, and as expression
  children. Direct fragment children of a resolved client component are also
  evaluated, using the existing `rsc/client-boundary-prop` rule and rendered-child
  diagnostic. Each tainted direct child can produce one finding.
- Text, empty JSX expressions/comments, and public expressions do not introduce
  taint. Fragment evaluation returns the first sensitive child's existing source
  reasons, limited to three, consistent with arrays and objects.
- No configuration, dependencies, CLI options, or rule IDs change.

## Limits

This is conservative syntax-based analysis, not React rendering or control-flow
analysis. It does not evaluate JSX element children inside fragments (for example
`<><span>{value}</span></>`) or resolve `React.Fragment`/aliased fragment components.
It does not add intrinsic DOM-element sinks or cross-module type-aware dataflow.
Existing file-wide binding tracking and recursion limits remain unchanged.

## Acceptance criteria

The `jsx-fragment-taint` fixture must produce exactly seven boundary findings:
inline prop, assigned prop, nested fragment prop, array prop, fragment expression
child, nested direct fragment child, and direct fragment child. The inline case
must retain `process.env.INTERNAL_VALUE` provenance. Three public controls (a
fragment variable, a direct fragment child with text/comments, and nested fragment
expression children) must remain clean. Analyzer and CLI regressions must pass.
