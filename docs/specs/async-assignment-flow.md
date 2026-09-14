# Specification — Async and Assignment-Operator Taint Flow

- **Version:** 1.0
- **Status:** implemented (milestone 2026-09-08)
- **Product:** `rsc-boundary` — static data-leak analyzer for Next.js / React Server Components
- **Extends:** [core-taint-analysis.md](core-taint-analysis.md)

## 1. Overview

Server components are async by convention (`await getSession()`,
`await db.query(...)`), and real-world state setup uses logical assignment
(`opts ||= fallback`, `current &&= record`). The core engine's taint
evaluator had no `AwaitExpression`/`YieldExpression` case, so `await` of a
sensitive call evaluated to untainted by falling into the `default` branch;
likewise the assignment walker only handled `=`, `??=`, and `+=`, so
`||=` / `&&=` silently dropped the right-hand taint and element-access
targets (`obj[k] ||= secret`) were missed. This specification closes both
gaps without touching rule severities, messages, or the CLI contract.

## 2. Behavior

| Expression shape | Resolution |
| --- | --- |
| `await expr` | Taint of `expr` (sensitive callee, `process.env`, sensitive identifier). |
| `yield expr` / `yield` | Same as `await`; bare `yield` is untainted. |
| `x ||= tainted`, `x &&= tainted` | Identifier, property-access, and element-access targets are tainted (`compound-assigned …`), matching the existing `+=` wording. |
| `obj[k] ||= tainted` | Element-access target tainted (new; previously only identifier/property targets were covered for `+=`). |
| `x as T`, `x satisfies T` | Transparent wrappers, same as before (`satisfies` is new; `as`/assertion/non-null behavior unchanged). |

Rules:

1. `await`/`yield` are pure pass-throughs in `taintReasonsWorker`: the
   operand is evaluated at `depth + 1` and returned verbatim, so an
   `await`ed sensitive call keeps its provenance chain (`returns
   process.env…`, `result of call …`).
2. Logical-assignment handling lives in `processBinaryExpression` next to
   the existing `+=` branch and fires only when the right-hand side is
   tainted (`isTainted(rhs)`), so `opts ||= "static"` stays silent.
3. `satisfies` joins the existing `as`/assertion/non-null case; it
   evaluates the asserted expression and returns its reasons verbatim.

## 3. Message examples

```
app/page.tsx:13:7  error  rsc/client-boundary-prop  Sensitive value flows into client component <Card> prop "title"
    tainted by: returns process.env; result of call loadSessionRecord(); returns read process.env.SESSION_ID
app/page.tsx:14:7  error  rsc/client-boundary-prop  Sensitive value flows into client component <Card> prop "title"
    tainted by: compound-assigned fallback
app/page.tsx:15:7  error  rsc/client-boundary-prop  Sensitive value flows into client component <Card> prop "title"
    tainted by: compound-assigned record
```

The static-text `<Card title="static text" />` prop in the fixture stays
silent, as do untainted `||=`/`&&=` assignments.

## 4. Proof-of-concept fixtures

- `test/fixtures/async-flow/` — `lib/session.ts` (server-only module whose
  async function returns `process.env.SESSION_ID`); `app/page.tsx` awaits it
  (`await loadSessionRecord()`), builds `opts ||= fallback` from
  `process.env.API_SECRET`, and folds `current &&= record`; all three flow
  into a local `"use client"` `<Card>` and report, while the static-text
  prop stays silent.

## 5. Known limits

- `for await…of` iteration values are not destructured for taint; use `await`
  inside the loop body, which is covered.
- Compound bitwise/shift assignments (`&=`, `|=`, `^=`, `<<=`, `>>=`,
  `>>>=`, `-=`, `*=`, `/=`, `%=`, `**=`) remain unhandled: numeric/bitwise
  folding of secrets is out of scope for the string/secret-flow model.
