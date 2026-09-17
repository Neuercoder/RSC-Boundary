# Specification — Functional Return Taint Propagation

- **Version:** 1.0
- **Status:** implemented (milestone 2026-09-17)
- **Product:** `rsc-boundary`

## Overview

Server code often shapes values in immediately invoked functions (IIFEs) and
collection transforms before rendering them. A sensitive value returned by an
IIFE, `Array.prototype.map`, or `Array.prototype.flatMap` remains sensitive;
the analyzer must preserve that flow into an RSC client-component boundary.

## Behavior

The taint evaluator treats the following as transparent return-value flows:

- an arrow function or function expression called immediately;
- the trailing inline arrow function or function expression passed to `.map()`
  or `.flatMap()`.

Both expression-bodied arrows and block-bodied functions with a tainted
`return` are supported. The returned expression supplies the original source
provenance; these shapes add no new rule or source category.

```tsx
const title = (() => process.env.API_SECRET)();
const labels = rows.map(() => process.env.API_SECRET);
const values = rows.flatMap(() => [process.env.API_SECRET]);

return <ClientCard title={labels[0]} />; // rsc/client-boundary-prop
```

Callback parameters continue to be bound from tainted receivers as specified
in [iteration-collection-taint.md](iteration-collection-taint.md). Thus a
transform result is tainted either because its receiver is tainted or because
its callback returns tainted data.

## Deliberate boundaries

- Only direct inline IIFEs are evaluated. Calls through an identifier keep the
  existing declared-function taint behavior.
- Only `map` and `flatMap` are callback-return transforms. Methods such as
  `forEach`, `filter`, `find`, and arbitrary third-party callbacks do not
  inherit callback-return taint, since that return value does not necessarily
  become the call result.
- No interprocedural or type-aware callback analysis is introduced.

## Verification

The `test/fixtures/functional-taint` app uses neutral variable names and
passes values through expression/block IIFEs plus `map`/`flatMap`. Analyzer and
CLI tests assert all four flows reach the local client `Card` boundary.
