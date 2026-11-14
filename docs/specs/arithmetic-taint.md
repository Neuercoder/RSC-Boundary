# Specification — Arithmetic and Bitwise Operator Taint

- **Version:** 1.0
- **Status:** Implemented (milestone 2026-10-16)
- **Product:** `rsc-boundary` — static data-leak analyzer for Next.js / React Server Components
- **Extends:** [core-taint-analysis.md](core-taint-analysis.md)

## 1. Overview

Before this milestone, the analyzer propagated taint through addition and
logical expressions, but not through these binary operators:

```text
-  *  /  %  **  <<  >>  >>>  &  |  ^
```

This leaves derived values clean when sensitive data appears on either side
of one of these operations. Treating these operations as taint-preserving
closes that gap without changing the analyzer's existing dataflow model.

## 2. Behavior

For each listed binary expression, evaluate the left operand first. If it is
tainted, return its taint reasons, capped at three, without inspecting the
right operand. If the left operand is clean, inspect the right operand and
return its taint reasons. Thus taint on either side propagates, while two
clean operands remain clean. The implementation does not union reasons from
both operands when the left is tainted. Operator evaluation adds no sanitizer
or source of its own.

| Operator | JavaScript expression form |
| --- | --- |
| `-` | subtraction |
| `*` | multiplication |
| `/` | division |
| `%` | remainder |
| `**` | exponentiation |
| `<<` | left shift |
| `>>` | sign-propagating right shift |
| `>>>` | zero-fill right shift |
| `&` | bitwise AND |
| `|` | bitwise OR |
| `^` | bitwise XOR |

Reasons are capped at three using the existing behavior. Existing finding
boundaries are unchanged.

## 3. Analysis model and boundaries

This extends conservative, per-file monotonic expression analysis only. It
does not add control-flow feasibility or retract taint after a clean
assignment. This spec does not change compound-assignment writes, comparisons,
cross-module analysis, or sanitization behavior. Existing `+` and logical
operator behavior remains unchanged.

## 4. Regression coverage

Analyzer tests exercise taint in both operand positions for each of the
eleven operators, plus clean controls; they assert exact prop names and the
environment source. The CLI fixture regression checks exit code `1`, finding
count, and clean silence; it reports 23 findings (22 operand-position flows
plus one nested derived-prop flow). The tests use neutral operand and prop
names so that they verify propagation rather than sensitive-name matching.
Verification passed: `npm test` (40/40), `npm run lint`, and
`git diff --check`; before the fix, the three new regressions failed while
the 37 baseline tests passed. See the
[milestone record](../milestones/2026-10-16-arithmetic-taint.md).
