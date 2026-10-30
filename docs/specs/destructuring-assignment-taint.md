# Destructuring Assignment Taint Propagation

## Goal

Close the gap between destructuring declarations and assignments when sensitive
values flow into React Server Component client props or other existing sinks.

## Behavior

- Object and array assignment patterns distribute right-hand-side taint to every
  target, conservatively treating the source as one aggregate value.
- Targets include identifiers, property accesses, element accesses, nested object
  and array patterns, and rest targets. Array holes are ignored.
- Defaults introduce their own taint even when the source is clean. Object
  shorthand defaults and renamed or nested target defaults are supported.
- Reading a configured sensitive object member introduces taint even when the
  source object has no tracked taint. Identifier names, quoted property names,
  and computed string-literal names use existing sensitive-member patterns.
- Reasons are preserved on actual target access paths. A clean sibling access
  path is not tainted merely because another property target was written.
- Assignment-expression results still use only the RHS for `=`. A previously
  tainted target does not make a clean assignment-expression result tainted.

## Limits

This remains monotonic, flow-insensitive, per-file analysis. Defaults are treated
as possible without proving whether the source member is undefined. Source taint
is not projected by member or index, so one sensitive source member may taint all
pattern targets. Dynamic computed member names, alias tracking, and clearing old
taint on clean writes are not added. Declaration binding behavior is unchanged.

## Acceptance

Regression fixtures cover object, array, nested, rest, omitted-element, default,
sensitive-member, and access-path targets; clean patterns, clean sibling paths,
and clean assignment-expression results remain unreported. The existing tests,
strict TypeScript compilation, lint, and whitespace checks must pass.
