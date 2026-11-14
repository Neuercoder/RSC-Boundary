# Nested binding-default taint

## Status

Implemented and locally verified in the [2026-11-05 milestone](../milestones/2026-11-05-nested-binding-defaults.md).

## Behavior

When a destructuring binding element has a tainted default initializer, propagate
that taint recursively to the identifiers bound by its name, rather than recording
the entire binding pattern as an unreadable taint key. This applies to variable
declarations and function parameters with object, array, and mixed nested patterns.

For example, `const { item: { value } = { value: process.env.PRIVATE_VALUE } } = {}`
marks `value` as tainted. An inner clean default does not erase taint contributed
by an enclosing default. Defaults containing only public literals remain clean,
and unrelated bindings do not inherit a sibling's taint.

Reuse the analyzer's existing recursive binding helper and default-value source
messages. Simple identifier defaults and other source/sink rules stay unchanged.

## Analysis model and limits

Analysis remains monotonic and conservative: a tainted default taints every name
in its binding pattern, even when runtime execution would not select that default.
This does not add per-member projection, call-site argument propagation,
scope-aware binding identities, control-flow feasibility, or alias analysis.
Destructuring assignments retain their separate existing implementation.

## Acceptance criteria

- Object, array, mixed nested, and nested clean-default bindings retain taint.
- Destructured function parameters follow the same rule.
- Clean object/array defaults and unrelated sibling bindings remain unflagged.
- The fixture yields exactly six client-boundary findings, each with environment
  source evidence; the CLI reports exit code 1.
- Existing analyzer/CLI tests, build, and lint continue to pass.
