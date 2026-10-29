# Destructuring-assignment taint (2026-10-29)

## Status

Implemented and locally verified.

## Scope

Implement the [destructuring-assignment specification](../specs/destructuring-assignment.md):
object/array assignment patterns, nesting, rest, defaults, property/index targets,
and static sensitive-member keys, with neutral-name regression coverage.

## Acceptance checks

- RHS and default taint reach all supported pattern targets.
- Configured sensitive-member keys taint extracted targets.
- Clean siblings and sibling indices stay clean.
- Existing assignment-expression and monotonic fixpoint behavior is preserved.
- Full tests (including strict TypeScript build), lint, and diff checks pass.
- Real CLI JSON scan exits 1 with the expected boundary findings.

## Verification results

- `npm test`: passed, 40/40 tests, including strict TypeScript build and test
  compilation.
- `npm run lint`: passed.
- `git diff --check`: passed.
- `node dist/cli.js scan test/fixtures/destructuring-assignment --json`:
  exited 1 with exactly 18 client-boundary findings and no clean-sibling findings.
- Regression evidence: before implementation, the new CLI regression expected
  18 boundary findings but observed only 3. The two new analyzer tests also
  failed; existing tests continued to pass.
