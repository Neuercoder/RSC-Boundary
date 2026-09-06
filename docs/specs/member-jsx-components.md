# Specification — Member JSX Components (`<Foo.Bar>`)

- **Version:** 1.0
- **Status:** implemented (milestone 2026-09-06)
- **Product:** `rsc-boundary` — static data-leak analyzer for Next.js / React Server Components
- **Extends:** [core-taint-analysis.md](core-taint-analysis.md)

## 1. Overview

Compound components — `<Card.Header>`, `<Panel.Item>`, `<Select.Option>` — are a
standard React composition pattern, and in Next.js App Router a member of a
`"use client"` component is itself a client component. The core engine's
`rsc/client-boundary-prop` rule only recognized plain identifier tags
(`<Card>`), so sensitive props and children passed to member tags flowed into
the browser unflagged. This specification closes that gap: any JSX tag whose
leftmost identifier is a locally-imported client component binding or
namespace import is treated as a client-component boundary.

## 2. Behavior

For every JSX element and self-closing element in a server (non-`"use client"`)
file, the analyzer resolves the tag against the client-component index:

| Tag shape | Resolution |
| --- | --- |
| `<Card>` | Identifier tag; unchanged behavior. |
| `<Card.Header>` | Member tag; base identifier `Card` must index a client component. |
| `<Panel.Item>` | Same as above (named import). |
| `<UI.Card.Header>` | Deep member chain; the leftmost identifier `UI` must index a client component (e.g. `import * as UI from "@/components/ui"`). |
| `<div>`, `<p>` | Intrinsic host elements are never boundaries (unchanged). |
| `<foo.Bar>` | Base identifier is lowercase → treated as intrinsic-like, skipped. |
| Unknown binding | Base identifier not indexed as a client component → skipped (no finding). |

Resolution rules:

1. Walk the tag's property-access chain to the leftmost identifier.
2. If that identifier is lowercase, the tag is intrinsic — skip.
3. Otherwise look the identifier up in the same client-component index used for
   plain tags (populated from resolved relative and `pathAliases` imports of
   `"use client"` files).
4. If it is a client component, the whole member tag is a client boundary:
   tainted props, spreads, and JSX-expression children are reported exactly as
   for plain tags, with the full tag text in the message
   (`<Card.Header>`, `<UI.Card.Body>`, …).
5. Once a member tag is resolved as a client boundary, its own member tags
   (`<Card.Header.Icon>`) inherit that treatment through the same lookup.

No rule internals change beyond tag resolution: this is purely an extension of
how a JSX tag maps to a client-component file.

## 3. Message examples

```
app/page.tsx:8:7  error  rsc/client-boundary-prop  Sensitive value flows into client component <Card.Header> prop "title"
app/page.tsx:11:7  error  rsc/client-boundary-prop  Sensitive value is rendered inside client component <Panel.Item>
```

## 4. Proof-of-concept fixtures

- `test/fixtures/member-jsx/` — server page rendering `<Card.Header
  title={sessionId}/>`, `<Panel.Item apiKey={accessKey}/>`, and
  `<Card.Body>{sessionId}</Card.Body>` through a named member import
  (`import { Card } from "../components/card"`) and a namespace import
  (`import * as Panel from "../components/panel"`); all three flows report, and
  a non-tainted `<Card subtitle="static text" />` stays silent.

## 5. Known limits

- The base identifier must be a *direct* import binding of a client file —
  member access on a locally-defined server component, or on a component
  re-exported from a barrel, is not followed (that is `export *` traversal,
  tracked separately in the core specification).
- Type-aware resolution (is this property access really a component?) is not
  performed: any member of a client component is conservatively treated as a
  client boundary, matching React's composition semantics.
