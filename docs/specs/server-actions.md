# Specification — Server Actions (`"use server"`)

- **Version:** 1.0
- **Status:** implemented (milestone 2026-09-11)
- **Product:** `rsc-boundary` — static data-leak analyzer for Next.js / React Server Components
- **Extends:** [core-taint-analysis.md](core-taint-analysis.md)

## 1. Overview

Next.js Server Actions (`"use server"` modules and inline `"use server"`
functions) execute on the server but are callable from client components, so
an action that returns a secret (or a sensitive value exported from its
module) is a data-leak boundary. The core engine only treated files importing
`server-only` / `next/headers` (or matching `sources.serverModules`) as server
modules, so a `"use server"` module with no such import was never reported as
an exporter, and the taint of its functions never reached callers.

This specification closes that gap: Server Action modules and functions count
as server-side, their sensitive exports are flagged, and their return-value
taint flows to importers like any other server-module binding.

## 2. Behavior

Detection is directive-based (a leading `"use server"` string-literal
statement; `"use client"` wins when both are present):

| Shape | Recording |
| --- | --- |
| File-level `"use server"` (first statement) | File is a server module (`serverReason = "\"use server\" directive"`); its exports are checked exactly like any other server module. |
| Inline `"use server"` (first statement of a function body) | Function name is recorded as a server action; its exported declaration is flagged when its return value is tainted, and its taint flows to callers through the existing function-returns-tainted model. |

Resolution rules:

1. `rsc/server-only-export` on Server Actions: an exported sensitive value in
   a `"use server"` module is reported (`Server module exports sensitive
   value "X"`); an exported function (declaration or variable-assigned arrow /
   function expression) whose body returns tainted data is reported (`Server
   module exports sensitive function "f"`). Clean actions in the same module
   stay silent.
2. Callers inherit action taint: `deleteAccount("user-1")` is tainted when
   `deleteAccount` returns tainted data (the existing call-argument / callee
   propagation), so `rsc/client-boundary-prop` still fires when the result
   reaches a client component prop/child/spread. No new sink is introduced.
3. No rule internals change beyond server marking: severities, message shapes,
   Finding shape, and the exit-code contract (0 clean / 1 findings /
   2 usage-error) are unchanged.

## 3. Message examples

```
lib/actions.ts:3:1  error  rsc/server-only-export  Server module exports sensitive value "ADMIN_TOKEN"
lib/actions.ts:5:1  error  rsc/server-only-export  Server module exports sensitive function "deleteAccount"
app/page.tsx:8:7  error  rsc/client-boundary-prop  Sensitive value flows into client component <Card> prop "title"
```

## 4. Proof-of-concept fixtures

- `test/fixtures/server-actions/` — `lib/actions.ts` (`"use server"` module
  exporting a sensitive value, a tainted action, and a clean action);
  `lib/inline.ts` (inline `"use server"` function plus a clean function);
  `app/page.tsx` (calls the tainted action and renders the result into a
  client component prop). Module exports, the inline action, and the
  client-boundary flow report; clean actions stay silent.

## 5. Known limits

- Directive detection is syntactic (leading string literal only); computed or
  nested directives are not directives.
- `"use client"` takes precedence: a file marked both is treated as client.
- Cross-module type-aware dataflow remains out of scope (see the core
  specification's limitations).
