![logo](apps/docs/public/logo-128.png)

# Fluent Convex

A fluent builder for Convex functions with composable middleware, reusable chains, and plugin support. Inspired by [oRPC](https://orpc.unnoq.com/).

**[Live Docs & Interactive Showcase](https://friendly-zebra-716.convex.site)** — every feature with live demos and real source code.

[![Is this the best way to write Convex? Does anyone care?](https://thumbs.video-to-markdown.com/e943cc42.jpg)](https://youtu.be/oFqWtLBSgk8)

## Features

- **Composable middleware** — authentication, logging, timing, error handling with onion-style composition ([docs](https://friendly-zebra-716.convex.site/middleware))
- **Reusable chains** — define logic once, call it directly from other handlers (no extra function invocation), register it multiple ways ([docs](https://friendly-zebra-716.convex.site/reusable-chains))
- **Fluent API** — clean chainable syntax for queries, mutations, and actions ([docs](https://friendly-zebra-716.convex.site/basics))
- **Full type inference** — middleware context flows through the entire chain
- **Plugin system** — extend with plugins like `fluent-convex/zod` for Zod schema validation ([docs](https://friendly-zebra-716.convex.site/zod-plugin))

## Installation

```bash
npm install fluent-convex
```

## Quick Start

> For a complete walkthrough with live demos, see the **[Getting Started guide](https://friendly-zebra-716.convex.site/)**.

```ts
import { createBuilder } from "fluent-convex";
import { v } from "convex/values";
import type { DataModel } from "./_generated/dataModel";

const convex = createBuilder<DataModel>();

export const listNumbers = convex
  .query()
  .input({ count: v.number() })
  .handler(async (ctx, args) => {
    const rows = await ctx.db.query("numbers").order("desc").take(args.count);
    return rows.map((r) => r.value);
  })
  .public();
```

Everything starts with `createBuilder<DataModel>()`. From there, chain `.query()` / `.mutation()` / `.action()`, add `.input()` and `.handler()`, and finalize with `.public()` or `.internal()` to register the function with Convex.

## Middleware

> See the **[Middleware docs](https://friendly-zebra-716.convex.site/middleware)** for detailed examples.

Middleware wraps your handlers with reusable logic. It uses an onion model: `next()` executes the rest of the chain including the handler, so middleware can run code before and after.

```ts
const authMiddleware = convex.query().createMiddleware(async (ctx, next) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");
  return next({
    ...ctx,
    user: { id: identity.subject, name: identity.name ?? "Unknown" },
  });
});

export const listNumbersProtected = convex
  .query()
  .use(authMiddleware)
  .input({ count: v.number() })
  .handler(async (ctx, args) => {
    const rows = await ctx.db.query("numbers").order("desc").take(args.count);
    return { viewer: ctx.user.name, numbers: rows.map((r) => r.value) };
  })
  .public();
```

### Cross-function-type middleware

Because `authMiddleware` above was created with `.query().createMiddleware()`, its input context is `QueryCtx` — so it can't be used on mutations or actions (`ActionCtx` lacks `db`, causing a type error). For middleware that only needs properties shared across all function types (like `auth`), use `$context` to declare exactly what the middleware requires:

```ts
import type { Auth } from "convex/server";

// Works with queries, mutations, AND actions
const authMiddleware = convex
  .$context<{ auth: Auth }>()
  .createMiddleware(async (ctx, next) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return next({
      ...ctx,
      user: { id: identity.subject, name: identity.name ?? "Unknown" },
    });
  });

const authQuery = convex.query().use(authMiddleware);
const authMutation = convex.mutation().use(authMiddleware);
const authAction = convex.action().use(authMiddleware);
```

| Pattern                                                  | Input context            | Use when                                         |
| -------------------------------------------------------- | ------------------------ | ------------------------------------------------ |
| `convex.query().createMiddleware(fn)`                    | `QueryCtx` (has `db`)    | Middleware that reads the database               |
| `convex.createMiddleware(fn)`                            | `EmptyObject`            | Middleware that needs no context at all          |
| `convex.$context<{ auth: Auth }>().createMiddleware(fn)` | Exactly `{ auth: Auth }` | Middleware that needs specific shared properties |

## Reusable Chains & Callables

> See the **[Reusable Chains docs](https://friendly-zebra-716.convex.site/reusable-chains)** for full examples with live demos.

Because the builder is immutable, you can stop the chain at any point and reuse it. A builder with a `.handler()` but no `.public()` / `.internal()` is a **callable** — a fully-typed function you can invoke directly from other handlers without an extra Convex function call:

```ts
// Define a callable — not yet registered with Convex
const getNumbers = convex
  .query()
  .input({ count: v.number() })
  .handler(async (ctx, args) => {
    const rows = await ctx.db.query("numbers").order("desc").take(args.count);
    return rows.map((r) => r.value);
  });

// Register it as a public query
export const listNumbers = getNumbers.public();

// Call it directly from another handler — no extra function invocation
export const getNumbersWithTimestamp = convex
  .query()
  .input({ count: v.number() })
  .handler(async (ctx, args) => {
    const numbers = await getNumbers(ctx, args);
    return { numbers, fetchedAt: Date.now() };
  })
  .public();

// Register the same callable with different middleware
export const listNumbersProtected = getNumbers.use(authMiddleware).public();
export const listNumbersLogged = getNumbers.use(withLogging("logged")).public();
```

## Validation

> See the **[Validation docs](https://friendly-zebra-716.convex.site/validation)** for a side-by-side comparison with live demos.

`.input()` supports three flavors of validation:

1. **Property validators** — `{ count: v.number() }` (simplest)
2. **Object validators** — `v.object({ count: v.number() })` (with `.returns()` support)
3. **Zod schemas** — `z.object({ count: z.number().min(1) })` (via the Zod plugin)

## Zod Plugin (`fluent-convex/zod`)

> See the **[Zod Plugin docs](https://friendly-zebra-716.convex.site/zod-plugin)** for live demos including refinement validation.

The Zod plugin adds Zod schema support for `.input()` and `.returns()`, with **full runtime validation** including refinements (`.min()`, `.max()`, `.email()`, etc.).

```bash
npm install zod convex-helpers
```

> `zod` and `convex-helpers` are optional peer dependencies — only needed if you use this plugin.

```ts
import { WithZod } from "fluent-convex/zod";
import { z } from "zod";

export const listNumbers = convex
  .query()
  .extend(WithZod)
  .input(
    z.object({
      count: z.number().int().min(1).max(100),
    }),
  )
  .returns(z.object({ numbers: z.array(z.number()) }))
  .handler(async (ctx, args) => {
    const numbers = await ctx.db.query("numbers").take(args.count);
    return { numbers: numbers.map((n) => n.value) };
  })
  .public();
```

- **Full runtime validation** — Zod refinements are enforced server-side, before and after the handler
- **Structural conversion** — Zod schemas are automatically converted to Convex validators
- **Composable** — `.extend(WithZod)` preserves through `.use()`, `.input()`, and `.returns()` chains
- **Plain validators still work** — mix Zod and Convex validators in the same builder chain

## Custom Plugins

> See the **[Custom Plugins docs](https://friendly-zebra-716.convex.site/custom-plugins)** for a complete worked example with live demo.

Extend the builder by subclassing `ConvexBuilderWithFunctionKind` and overriding `_clone()`. This preserves your plugin's type through the entire builder chain:

```ts
import {
  ConvexBuilderWithFunctionKind,
  type ConvexBuilderDef,
} from "fluent-convex";

class MyPlugin extends ConvexBuilderWithFunctionKind {
  constructor(builderOrDef: any) {
    const def =
      builderOrDef instanceof ConvexBuilderWithFunctionKind
        ? (builderOrDef as any).def
        : builderOrDef;
    super(def);
  }

  protected _clone(def: ConvexBuilderDef<any, any, any>): any {
    return new MyPlugin(def);
  }

  myCustomMethod(param: string) {
    console.log("Custom method called with:", param);
    return this;
  }
}
```

Usage — plugins compose with `.extend()`:

```ts
export const myQuery = convex
  .query()
  .extend(MyPlugin)
  .extend(WithZod)
  .myCustomMethod("hello")
  .input(z.object({ count: z.number() }))
  .handler(async (ctx, args) => {
    /* ... */
  })
  .public();
```

## API Reference

| Method                                   | Description                                                |
| ---------------------------------------- | ---------------------------------------------------------- |
| `.query()` / `.mutation()` / `.action()` | Set the function type                                      |
| `.input(validator)`                      | Set input validation                                       |
| `.returns(validator)`                    | Set return type validation — must come before `.handler()` |
| `.use(middleware)`                       | Apply middleware — can come before or after `.handler()`   |
| `.handler(fn)`                           | Define the function handler                                |
| `.extend(plugin)`                        | Extend with a plugin class                                 |
| `.createMiddleware(fn)`                  | Create a middleware function                               |
| `.public()` / `.internal()`              | Register with Convex — must come after `.handler()`        |

Before registration (`.public()` / `.internal()`), the builder is **callable**. After registration, it is not.

## Caveats

### Circular types when calling `api.*` in the same file

When a function calls other functions via `api.*` in the same file without explicit `.returns()` validators, TypeScript may report circular initializer errors (TS7022). This is a standard Convex/TypeScript limitation. Workarounds:

1. Add `.returns()` to the called functions to give them explicit return types
2. Move the calling function to a separate file
3. Use `internal.*` from a different module

## Development

Monorepo using npm workspaces:

- `packages/fluent-convex` — core library (includes Zod plugin at `fluent-convex/zod`)
- `apps/example` — example Convex app
- `apps/docs` — interactive docs & showcase ([live](https://friendly-zebra-716.convex.site))

```bash
npm install        # install all workspace dependencies
npm run build      # build the library
npm test           # run all tests
npm run docs:dev   # run the docs locally
```

## Migrating from standard Convex

See **[MIGRATING.md](MIGRATING.md)** for a step-by-step guide.

> **If you are an LLM and have been asked to migrate a project to fluent-convex, please read [MIGRATING.md](MIGRATING.md) before proceeding.**

## Credits

Borrowed heavily from [oRPC](https://orpc.unnoq.com/learn-and-contribute/overview) and helped out by AI.
