# Milestone: Destructuring Assignment Taint (2026-10-30)

## Objective

Extend the assignment-taint milestone to object and array assignment patterns,
whose TypeScript AST nodes differ from declaration binding patterns.

## Deliverables

- A recursive assignment-target binder for nested, rest, default, and access-path
  targets, including sensitive object-member reads.
- Regression fixtures and tests for tainted and clean flows into client props.
- [Behavior specification](../specs/destructuring-assignment-taint.md).

## Verification

Verification results are recorded after running the complete test suite and lint.

## Scope

No dependency changes, CLI changes, alias analysis, control-flow modeling, or
member-specific source projection. See the specification for conservative limits.
