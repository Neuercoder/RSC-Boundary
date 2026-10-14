# Milestone 2026-09-15 — Element-Access (Bracket) Taint Reads

- **Status:** Implemented (landed to `main`)
- **Date:** 2026-09-15
- **Spec:** [docs/specs/element-access-taint.md](../specs/element-access-taint.md)

## Goal

Close the bracket-read blind spot of the taint analyzer. Server code
reads sensitive fields through computed syntax — `user["password"]`,
`cfg['apiKey']`, `` vault[`password`] ``, and copies such as
`const item = vault["password"]` — but the engine only modeled dot
reads (`user.password`): element-access nodes had no walk dispatch and
no evaluator case beyond a plain lookup with fallback to the base, so
every bracket spelling silently dropped the taint and the leak into
the client component went unflagged. This milestone makes static
string-literal and no-substitution-template-literal keys read exactly
like dot access, for tainted bases and for the sensitive-member rule
alike.

## Scope

- `src/analyzer.ts` — one new walk helper, one new key helper, and an
  extended evaluator case:
  - `processElementAccess` (walk dispatch for
    `ElementAccessExpression`): taints the full bracket text with the
    base's own provenance (plus the normalized `base.key` text when
    the key is static), or — on an unknown base — taints the bracket
    text as `read of "….key" (sensitive member)` when the static key
    matches, mirroring `processPropertyAccess`.
  - `staticElementKey` (string literals and no-substitution template
    literals resolve to their text; identifiers, numerics, and
    template expressions are dynamic → `null`).
  - `taintReasonsWorker`'s `ElementAccessExpression` case: exact text,
    then normalized member, then sensitive-key match, then base
    fallback — so dynamic/numeric keys (`labels[0]`, `bucket[0]`,
    `user[key]`) keep their prior collection-modeling provenance.
- No rule, sink, config, or CLI changes: once bound, bracket reads
  flow through variable binding, spreads, JSX props/children, and
  export checks exactly like dot reads, with reused (not new)
  provenance text.
- Fixture app + unit/CLI tests using an untainted `account` prop base
  (proving the sensitive-member rule) and awaited `server-only`
  results with cleared `sensitiveIdentifiers`/`sensitiveMembers`
  (proving base inheritance, not name matching).
- Docs: spec + milestone; core-spec §11 and README updated.

## Deliverables

| Path | Purpose |
| --- | --- |
| `src/analyzer.ts` | `processElementAccess` + walk dispatch; `staticElementKey`; extended `ElementAccessExpression` evaluator case |
| `test/fixtures/element-access-taint/` | Async page: unknown-base `account["password"]`, three literal-key spellings on a tainted vault, `item` copy, `cfg["apiKey"] ?? "none"` — all six flow into `<Card title>` |
| `test/analyzer.test.ts` | Unknown-base sensitive-member test; literal-key/base-inheritance test with name matching disabled (3 spellings + `item` copy + `cfg` read) |
| `test/cli.test.ts` | End-to-end scan of the element-access fixture (6 boundary findings, exit 1) |
| `docs/specs/element-access-taint.md` | Behavior specification |

## Verification

- `npm run build` — clean `tsc` compile (strict).
- `npm test` — all prior tests plus 3 new tests pass (2 analyzer + 1 CLI; 37 total).
- `npm run lint` — clean `eslint`.
- Smoke run: `node dist/cli.js scan test/fixtures/element-access-taint` reports the
  six client-boundary flows plus the two `server-only-export` findings for the
  `loadVault` / `loadConfig` helpers (exit 1).

## Out of scope (future milestones)

- Dynamic keys stay dynamic: numeric indices, identifiers,
  member-expression keys, and templates with substitutions never
  trigger the sensitive-member rule and never create normalized
  entries — they inherit the base's taint only.
- No value-level key resolution (`const k = "password"; user[k]`
  stays clean).
- Normalized entries are per-base-text; aliased bases do not share
  them.
- No `break`/`continue`-sensitive control-flow ordering; closures use
  the same fixpoint-local reasoning as every other expression.
- Cross-module type-aware dataflow remains open; see the core
  specification's limitations.
