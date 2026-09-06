# Milestone 2026-09-06 — Member JSX Components (`<Foo.Bar>`)

- **Status:** Implemented (landed to `main`)
- **Date:** 2026-09-06
- **Spec:** [docs/specs/member-jsx-components.md](../specs/member-jsx-components.md)

## Goal

Close the compound-component blind spot of the client-boundary rule. Next.js
apps compose client components through member tags (`<Card.Header>`,
`<Panel.Item>`, `<UI.Card.Body>`) as often as plain tags, and the core engine
silently skipped every non-identifier JSX tag — so sensitive props and children
crossed into the browser unflagged. This milestone treats any JSX tag whose
leftmost identifier is a locally-imported client component (named binding or
namespace import) as a client boundary, with full taint checks on props,
spreads, and children.

## Scope

- `src/analyzer.ts` — `processJsx()` resolves member-expression tags
  (`<Foo.Bar>`, deep chains `<UI.Card.Body>`) through the existing
  client-component index, keyed by the leftmost identifier; intrinsic
  host elements and unknown bindings are still skipped.
- Messages carry the full tag text (`<Card.Header>`) so findings stay
  greppable and distinct from plain-tag findings.
- Fixture app + unit/CLI tests covering named-member, namespace-member, and
  deep-member flows, plus a non-tainted member tag that must stay silent.

## Deliverables

| Path | Purpose |
| --- | --- |
| `src/analyzer.ts` | Member-tag resolution in `processJsx()` (`resolveClientTag`) |
| `test/fixtures/member-jsx/` | App leaking through `<Card.Header>`, `<Panel.Item>`, `<Card.Body>` |
| `test/analyzer.test.ts` | Member-tag boundary findings (named + namespace + deep) |
| `test/cli.test.ts` | End-to-end scan of the member-jsx fixture |
| `docs/specs/member-jsx-components.md` | Behavior specification |

## Verification

- `npm run build` — clean `tsc` compile (strict).
- `npm test` — all prior tests plus 2 new tests pass (member-tag analyzer
  findings and CLI scan of the fixture).
- `npm run lint` — clean `eslint`.
- Smoke run: `node dist/cli.js scan test/fixtures/member-jsx` reports the
  three member-tag leaks (exit 1).

## Out of scope (future milestones)

- `export *` re-export traversal (barrel files re-exporting sensitive
  values) and cross-module type-aware dataflow remain open; see the core
  specification's limitations.
