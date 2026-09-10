# Specification — Awaited Taint & Public Env Passthrough

- **Version:** 1.0
- **Status:** implemented (milestone 2026-09-10)
- **Product:** `rsc-boundary` — static data-leak analyzer for Next.js / React Server Components
- **Extends:** [core-taint-analysis.md](core-taint-analysis.md)

## 1. Overview

Two gaps in the core taint model produced wrong verdicts on idiomatic Next.js
App Router code. `async` server components routinely `await` server data
(`await getUser(1)`, `await Promise.resolve(process.env.SECRET)`), but the
expression evaluator had no `AwaitExpression`/`YieldExpression` case, so the
taint stopped at the `await` keyword and awaited leaks flowed into client
components unflagged. Conversely, `NEXT_PUBLIC_*` environment variables are
inlined into the client bundle by design, yet every `process.env.*` read was
a source — so public values passed to client components were flagged as
leaks. This specification closes both gaps: `await`/`yield` transparently
pass taint through, and `NEXT_PUBLIC_*` reads are public.

## 2. Behavior

Taint evaluation (`taintReasonsWorker` in `src/analyzer.ts`):

| Expression shape | Resolution |
| --- | --- |
| `await <expr>`, `yield <expr>` | Transparent passthrough: taint of the inner expression. Bare `await`/`yield` with no operand is untainted. |
| `process.env.NEXT_PUBLIC_X` | Public: no taint reasons. Checked before the generic `process.env.*` source case (directly and through parentheses). |
| `process.env["NEXT_PUBLIC_X"]` | Public: element access whose object is `process.env` and whose string-literal key starts with `NEXT_PUBLIC_` yields no taint. Other element accesses are unchanged. |
| Any other `process.env.*` | Unchanged: still a source. |

Taint assignment (`bindNames`, `processPropertyAccess`):

1. Names bound solely from `process.env` provenance (`const pub =
   process.env.NEXT_PUBLIC_X`) stay public: taint is not bound when every
   reason is exactly `process.env`. This covers the indirect case where the
   inner expression's reasons collapse to the bare-env base (e.g. through
   `??`/template helpers) instead of the full member text.
2. `process.env` member writes whose full text is a `NEXT_PUBLIC_*` read
   (e.g. `process.env.NEXT_PUBLIC_X`) are never tainted by the property walk,
   matching the evaluator.

Resolution rules:

1. `await`/`yield` never create taint on their own; they only forward the
   operand's reasons (up to 3, like every other passthrough).
2. `NEXT_PUBLIC_*` never creates taint, never binds taint to a name, and
   never appears in a finding's `sources`. A finding whose only provenance
   would be a public read is not emitted.
3. Mixing public and sensitive data follows the existing combinators: `pub ??
   secret`, `` `${pub}${secret}` ``, and `await secret` are tainted; `await
   pub` and bare `pub` are not.

No rule internals change beyond taint resolution: severities, message shapes,
Finding shape, and the exit-code contract (0 clean / 1 findings / 2
usage-error) are unchanged.

## 3. Message examples

```
app/page.tsx:9:7  error  rsc/client-boundary-prop  Sensitive value flows into client component <Card> prop "title"
    tainted by: import getUser from "../lib/db" (server module); result of call getUser(1)
```

`process.env.NEXT_PUBLIC_API_KEY` in the same position produces no finding.

## 4. Proof-of-concept fixtures

- `test/fixtures/async-public/` — `async` server page that `await`s a
  server-module call (`await getUser(1)`) and an env read (`await
  Promise.resolve(process.env.SECRET_KEY)`), alongside `NEXT_PUBLIC_*` reads
  in direct (`process.env.NEXT_PUBLIC_API_KEY`), inline
  (`process.env.NEXT_PUBLIC_INLINE_KEY`), and bracket
  (`process.env["NEXT_PUBLIC_BRACKET_KEY"]`) forms plus a static prop. The
  two awaited flows report; all three public forms and the static prop stay
  silent (exactly 2 `rsc/client-boundary-prop` findings).

## 5. Known limits

- `NEXT_PUBLIC_*` detection is syntactic on `process.env` reads. Aliases
  (`const env = process.env; env.NEXT_PUBLIC_X`) still resolve through the
  generic base-taint path, and the `bindNames` guard only covers provenance
  that collapses to exactly `process.env`.
- `yield` passthrough exists for generator parity; async-generator dataflow
  is not otherwise modeled.
- Type-aware resolution is not performed: any sensitive export flowing
  through the chain taints conservatively, as before.
