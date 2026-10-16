# Specification — Arithmetic and Bitwise Operator Taint

- **Version:** 1.0
- **Status:** Implemented (milestone 2026-10-16)
- **Product:** `rsc-boundary` — static data-leak analyzer for Next.js / React Server Components
- **Extends:** [core-taint-analysis.md](core-taint-analysis.md)

## 1. Overview

The analyzer already propagates taint through addition and logical
expressions, but currently does not propagate it through these binary
operators:

```text
-  *  /  %  **  <<  >>  >>>  &  |  ^
```

This leaves derived values clean when sensitive data appears on either side
of one of these operations. Treating these operations as taint-preserving
closes that gap without changing the analyzer's existing dataflow model.

## 2. Behavior

For each listed binary expression, evaluate the left operand followed by the
right operand and combine their taint reasons using the existing provenance
rules. The expression is tainted if either operand is tainted; if both
operands are clean, the expression remains clean. Operator evaluation adds
no sanitizer or source of its own.

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

The result retains source reasons from both operands subject to the existing
maximum of three sources. Existing source ordering/deduplication and finding
boundaries are unchanged.

## 3. Analysis model and boundaries

This extends conservative, per-file monotonic expression analysis only. It
does not add control-flow feasibility or retract taint after a clean
assignment. This spec does not change compound-assignment writes, comparisons,
cross-module analysis, or sanitization behavior. Existing `+` and logical
operator behavior remains unchanged.

## 4. Regression coverage

Analyzer tests exercise a tainted left operand and a tainted right operand
for each of the eleven operators, with clean-operand controls to ensure that
ordinary values remain clean. A CLI fixture regression sends a derived
tainted value to the existing client-component prop boundary and asserts
exit code `1` plus the exact expected finding properties (file, location,
severity, rule ID, message, and source list). The CLI fixture reports 23
findings: 22 operand-side flows plus one nested derived-prop flow; clean
controls remain silent. The tests use neutral
operand and prop names so that they verify propagation rather than
sensitive-name matching. Verification passed: `npm test` (40/40),
`npm run lint`, and `git diff --check`; before the fix, the three new
regressions failed while the 37 baseline tests passed. See the
[milestone record](../milestones/2026-10-16-arithmetic-taint.md).
