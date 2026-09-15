# Specification — Element-Access (Bracket) Taint Reads

- **Version:** 1.0
- **Status:** implemented (milestone 2026-09-15)
- **Product:** `rsc-boundary` — static data-leak analyzer for Next.js / React Server Components
- **Extends:** [core-taint-analysis.md](core-taint-analysis.md)

## 1. Overview

Server code reads sensitive fields through computed bracket syntax as
often as through dot syntax — `user["password"]` from JSON-shaped rows,
`cfg['apiKey']` from dynamic config maps, `` vault[`password`] `` from
template-keyed lookups, and copies such as `const item =
vault["password"]` that flow onward into client components. The core
engine modeled dot reads (`user.password`) but had no model for the
bracket form, so every one of these shapes silently dropped the taint:

- `user["password"]` — no walk dispatch and no evaluator case beyond a
  plain text lookup with fallback to the base expression, so the
  `….password` sensitive-member rule never fired.
- `vault["password"]` where `vault` is an awaited `server-only` result
  — the base was tainted but the bracket read itself bound nothing, so
  `<Card title={vault["password"]} />` and downstream copies
  (`const item = vault["password"]`) reported nothing.
- `` vault[`password`] `` (no-substitution template key) — same gap in
  a second spelling.

This specification closes that gap: static string-literal and
no-substitution-template-literal bracket keys read exactly like dot
access, both for tainted bases and for the sensitive-member rule on
unknown bases. Numeric indices, identifier keys, and template
expressions stay dynamic and keep the prior base-fallback behavior, so
existing collection modeling (`labels[0]`, `bucket[0]` from
[iteration-collection-taint.md](iteration-collection-taint.md)) is
unchanged.

## 2. Behavior

### 2.1 Walk: `processElementAccess`

Runs during the tree walk for every `ElementAccessExpression`:

| Bracket read | Binding |
| --- | --- |
| Tainted base (`vault["password"]`, `labels[0]`, `bucket[0]`) | The full bracket text (`vault["password"]`) is tainted with the base's own provenance reasons (not a shallow `read …` shadow), so later lookups answer with the underlying chain (`loadVault`, `rows.map`, `process.env`). When the key is static, the normalized member text (`vault.password`) is tainted with the same reasons, so `{ password }` destructures and later dot reads agree. |
| Static literal key matching `sensitiveMembers` on an unknown base (`user["password"]`, `cfg['apiKey']`) | The full bracket text is tainted as `read of "….key" (sensitive member)`, mirroring `processPropertyAccess`'s provenance for `user.password`. |
| Anything else (dynamic key on an unknown base: `user[key]`, `arr[0]` on a clean array) | No binding. |

`staticElementKey` resolves only string literals (`["password"]`,
`['password']`) and no-substitution template literals
(`` [`password`] ``) to their text. Identifiers, numeric literals,
property-access keys, and templates with substitutions are dynamic and
yield `null`.

### 2.2 Evaluation: `taintReasonsWorker` element-access case

Bracket reads evaluate in this order:

1. Exact tracked text (`user["password"]` as written) wins when present.
2. Static key + tainted normalized member (`vault.password`, bound by
   the walk visit) answers the bracket form.
3. Static key matching `sensitiveMembers` taints unknown bases as
   `read of "….key" (sensitive member)`.
4. Otherwise the base expression is evaluated (numeric/dynamic keys
   such as `labels[0]` or `user[key]` fall through here, preserving
   the collection-modeling provenance).

### 2.3 Message examples

```
app/page.tsx:15:7  error  rsc/client-boundary-prop  Sensitive value flows into client component <Card> prop "title"
    tainted by: read of "….password" (sensitive member)
```

```
app/page.tsx:16:7  error  rsc/client-boundary-prop  Sensitive value flows into client component <Card> prop "title"
    tainted by: read of "….password" (sensitive member), returns process.env, result of call loadVault()
```

## 3. Proof-of-concept fixtures

- `test/fixtures/element-access-taint/` — an async server page that:
  - passes `account["password"]` (untainted prop base) to `<Card
    title>`, proving the sensitive-member bracket rule;
  - passes `vault["password"]`, `vault['password']`, and
    `` vault[`password`] `` (awaited `server-only` result) to `<Card
    title>`, proving all three literal-key spellings inherit base
    provenance;
  - copies `vault["password"]` into `item` and passes `item` to `<Card
    title>`, proving the bracket read binds a reusable tainted name;
  - passes `cfg["apiKey"] ?? "none"` (awaited `server-only` config)
    to `<Card title>`, proving bracket reads flow through `??`.
  - All six flows report, plus the two `server-only-export` findings
    for the `loadVault` / `loadConfig` helpers themselves.

## 4. Known limits

- Only string-literal and no-substitution-template-literal keys are
  static. Numeric literals (`arr[0]`), identifiers (`user[key]`),
  member keys (`cfg[field]`), and templates with substitutions
  (`` vault[`${k}`] ``) are dynamic: they never trigger the
  sensitive-member rule and never create a normalized `base.key`
  entry — they fall back to the base expression's taint.
- No value-level key resolution: `const k = "password"; user[k]` stays
  clean even though `k` holds a sensitive string.
- Normalized member entries are per-base-text (`vault.password` from
  `vault["password"]`); aliased bases (`const alias = vault;
  alias["password"]`) do not share them, matching the existing
  text-keyed treatment of dot reads.
- Chained computed lookups (`row["user"]["password"]`) taint the
  outer read when the inner read is tainted; the inner unknown-base
  read itself reports only when its own key is sensitive.
- Case sensitivity and pattern semantics follow the configured
  `sensitiveMembers` regexes, exactly as for dot reads.
