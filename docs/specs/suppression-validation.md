# Suppression selector validation

## Goal

A malformed suppression must not silently disable leak detection. Previously,
arrays and selector-free objects passed validation and matched every finding.

## Contract

- A suppression is a non-null, non-array object containing at least one of
  `file`, `ruleId`, `message`, or `line`.
- Every supplied string selector must be a non-blank string. Matching remains
  case-sensitive, and selectors are not trimmed or otherwise normalized.
- A supplied `line` must be a positive safe integer (1-based).
- Invalid entries are ignored as a whole, never partially applied. Unknown
  fields do not qualify as selectors; extra fields alongside valid selectors
  remain compatible.
- All provided selectors must match. File and message selectors use substring
  matching; rule IDs and line numbers use exact matching.
- The same validation applies to loaded JSON and programmatic analyzer options.
  Valid entries in a mixed list continue to work.
- An empty list suppresses nothing. Empty objects, arrays, blank selectors,
  and unknown-only objects no longer serve as implicit suppress-all entries.
  Use explicit rule selectors when broad suppression is intended.

## Verification

Regression tests exercise malformed JSON entries, programmatic non-finite line
values, valid individual and combined selectors, nonmatching selectors, mixed
lists, and built-CLI JSON output with exit code 1 for a leaking file.

No changes to source tracking, rule IDs, dependencies, or config discovery.
Malformed JSON syntax retains its existing error behavior; this milestone
does not add general configuration-schema validation or diagnostics.
