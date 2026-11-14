# Recursive binding-pattern taint

## Status

Implemented and locally verified in the
[2026-11-06 milestone](../milestones/2026-11-06-binding-pattern-taint.md).

## Behavior

Declaration and parameter destructuring must bind taint to destination identifiers,
not the text of an entire nested pattern.

- Recursively propagate incoming taint through object and array binding patterns,
  including holes and rest bindings.
- Merge incoming taint with each binding element's default initializer taint.
  Defaults remain possible sources even when the containing initializer is clean.
- Treat statically named sensitive object members as sources, including renamed,
  shorthand, and string-literal keys. Nested object/array destinations inherit
  these reasons. A rest destination name is not an object-member read.
- Preserve sensitive destination-name detection and all source reasons instead
  of stopping recursion at the first sensitive member.
- Apply the same recursive binding helper wherever already used, including
  parameter defaults, iteration targets, and collection callbacks.

## Model and limits

This retains the existing conservative, monotonic per-file fixpoint. Incoming
object/array taint reaches all destinations; members are not projected individually.
Defaults count regardless of runtime feasibility, and clean overwrites do not
clear taint. Identifier scope resolution, alias tracking, computed-key source
inference, call-argument-to-parameter analysis, and control-flow feasibility are
not added. Expression-shaped destructuring assignments retain their separate
existing implementation.

## Regression coverage

The neutral-name fixture in `test/fixtures/binding-pattern-taint/` covers nested
object and array defaults, sensitive identifier/string keys with nested targets,
sensitive reads from a clean initializer, tainted inputs with clean defaults,
nested rest and array holes, multi-level defaults, and parameter bindings.
Analyzer tests assert thirteen exact boundary locations with source evidence;
two clean nested-default controls must remain unflagged. A built-CLI test checks
JSON findings and exit status.
