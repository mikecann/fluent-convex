![logo](apps/docs/public/logo-128.png)

# Fluent Convex

A fluent API builder for Convex functions with middleware support, inspired by [oRPC](https://orpc.unnoq.com/).

**[Live Docs & Interactive Showcase](https://friendly-zebra-716.convex.site)** -- see every feature in action with live demos and real source code.

## Features

- **Middleware support** - Compose reusable middleware for authentication, logging, and more ([docs](https://friendly-zebra-716.convex.site/middleware))
- **Callable builders** - Define logic once, call it directly from other handlers, and register it multiple ways ([docs](https://friendly-zebra-716.convex.site/reusable-chains))
- **Type-safe** - Full TypeScript support with type inference
- **Fluent API** - Chain methods for a clean, readable syntax ([docs](https://friendly-zebra-716.convex.site/basics))
- **Plugin system** - Extend with plugins like `fluent-convex/zod` for Zod schema support ([docs](https://friendly-zebra-716.convex.site/zod-plugin))
- **Extensible** - Build your own plugins with the `_clone()` factory pattern ([docs](https://friendly-zebra-716.convex.site/custom-plugins))
- **Works with Convex** - Built on top of Convex's function system

## Installation

```bash
npm install fluent-convex
```

## Quick Start

> For a complete walkthrough with live demos, see the **[Getting Started guide](https://friendly-zebra-716.convex.site/)**.

**Important:** All functions must end with `.public()` or `.internal()` to be registered with Convex.

```ts
import { createBuilder } from "fluent-convex";
import { v } from "convex/values";
import type { DataModel } from "./_generated/dataModel";

const convex = createBuilder<DataModel>();

// Simple query
export const listNumbers = convex
  .query()
  .input({ count: v.number() })
  .handler(async (context, input) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return { numbers: numbers.map((n) => n.value) };
  })
  .public(); // Must end with .public() or .internal()

// With middleware
const authMiddleware = convex.query().createMiddleware(async (context, next) => {
  const identity = await context.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }

  return next({
    ...context,
    user: {
      id: identity.subject,
      name: identity.name ?? "Unknown",
    },
  });
});

export const listNumbersAuth = convex
  .query()
  .use(authMiddleware)
  .input({ count: v.number() })
  .handler(async (context, input) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return {
      viewer: context.user.name, // user is available from middleware!
      numbers: numbers.map((n) => n.value),
    };
  })
  .public();
```

## Validation

> See the **[Validation docs](https://friendly-zebra-716.convex.site/validation)** for a side-by-side comparison of all three approaches with live demos.

fluent-convex supports three flavors of input validation through the same `.input()` API:

1. **Property validators** -- `{ count: v.number() }` (simplest)
2. **Object validators** -- `v.object({ count: v.number() })` (with `.returns()` support)
3. **Zod schemas** -- `z.object({ count: z.number().min(1) })` (via the Zod plugin)

## Middleware

> See the **[Middleware docs](https://friendly-zebra-716.convex.site/middleware)** for detailed examples of both patterns.

There are two main middleware patterns:

- **Context-enrichment** -- adds new properties to the context (e.g. `ctx.user`)
- **Onion (wrap)** -- runs code before *and* after the handler (e.g. timing, error handling)

## Reusable Chains & Callables

> See the **[Reusable Chains docs](https://friendly-zebra-716.convex.site/reusable-chains)** for full examples with live demos.

Because the builder is immutable, you can stop the chain at any point and reuse that partial builder later. A builder with a `.handler()` but no `.public()` / `.internal()` is called a **callable** -- a fully-typed function you can:

1. **Call directly** from inside other handlers (no additional Convex function invocation)
2. **Register** as a standalone Convex endpoint
3. **Extend** with more middleware and register multiple ways

```ts
// 1. Define a callable - NOT yet registered with Convex
const getNumbers = convex
  .query()
  .input({ count: v.number() })
  .handler(async (ctx, args) => {
    const rows = await ctx.db.query("numbers").order("desc").take(args.count);
    return rows.map((r) => r.value);
  });

// 2. Register it as a public query
export const listNumbers = getNumbers.public();

// 3. Call it directly from inside another handler - no additional function invocation!
export const getNumbersWithTimestamp = convex
  .query()
  .input({ count: v.number() })
  .handler(async (ctx, args) => {
    const numbers = await getNumbers(ctx, args); // <-- direct call
    return { numbers, fetchedAt: Date.now() };
  })
  .public();

// 4. Register the same callable with different middleware
export const listNumbersProtected = getNumbers.use(authMiddleware).public();
export const listNumbersLogged = getNumbers.use(withLogging("logged")).public();
```

The callable syntax is `callable(ctx, args)` -- the first argument passes the context (so the middleware chain runs with the right ctx), the second passes the validated arguments.

## Plugins

### Zod Plugin (`fluent-convex/zod`)

> See the **[Zod Plugin docs](https://friendly-zebra-716.convex.site/zod-plugin)** for live demos including refinement validation.

The Zod plugin adds Zod schema support for `.input()` and `.returns()`, with **full runtime validation** including refinements (`.min()`, `.max()`, `.email()`, etc.).

```bash
npm install zod convex-helpers
```

> **Note:** `zod` and `convex-helpers` are optional peer dependencies of `fluent-convex`. They're only needed if you use the Zod plugin.

Usage:

```ts
import { createBuilder } from "fluent-convex";
import { WithZod } from "fluent-convex/zod";
import { z } from "zod";
import type { DataModel } from "./_generated/dataModel";

const convex = createBuilder<DataModel>();

export const listNumbers = convex
  .query()
  .extend(WithZod) // Enable Zod support
  .input(
    z.object({
      count: z.number().int().min(1).max(100), // Refinements enforced at runtime!
    })
  )
  .returns(z.object({ numbers: z.array(z.number()) }))
  .handler(async (context, input) => {
    const numbers = await context.db.query("numbers").take(input.count);
    return { numbers: numbers.map((n) => n.value) };
  })
  .public();
```

Key features:
- **Full runtime validation** - Zod refinements (`.min()`, `.max()`, `.email()`, `.regex()`, etc.) are enforced server-side. Args are validated before the handler runs; return values after.
- **Structural conversion** - Zod schemas are automatically converted to Convex validators for Convex's built-in validation.
- **Composable** - `.extend(WithZod)` preserves the `WithZod` type through `.use()`, `.input()`, and `.returns()` chains.
- **Plain validators still work** - You can mix Zod and Convex validators in the same builder chain.

## Extensibility

> See the **[Custom Plugins docs](https://friendly-zebra-716.convex.site/custom-plugins)** for a complete worked example with live demo.

You can extend the builder with your own plugins by subclassing `ConvexBuilderWithFunctionKind` and overriding the `_clone()` factory method.

### Writing a Plugin

The `_clone()` method is called internally by `.use()`, `.input()`, and `.returns()` to create new builder instances. By overriding it, your plugin's type is preserved through the entire builder chain.

```ts
import {
  ConvexBuilderWithFunctionKind,
  type GenericDataModel,
  type FunctionType,
  type Context,
  type EmptyObject,
  type ConvexArgsValidator,
  type ConvexReturnsValidator,
  type ConvexBuilderDef,
} from "fluent-convex";

class MyPlugin<
  TDataModel extends GenericDataModel = GenericDataModel,
  TFunctionType extends FunctionType = FunctionType,
  TCurrentContext extends Context = EmptyObject,
  TArgsValidator extends ConvexArgsValidator | undefined = undefined,
  TReturnsValidator extends ConvexReturnsValidator | undefined = undefined,
> extends ConvexBuilderWithFunctionKind<
  TDataModel,
  TFunctionType,
  TCurrentContext,
  TArgsValidator,
  TReturnsValidator
> {
  // Accept both builder instances (from .extend()) and raw defs (from _clone())
  constructor(builderOrDef: any) {
    const def =
      builderOrDef instanceof ConvexBuilderWithFunctionKind
        ? (builderOrDef as any).def
        : builderOrDef;
    super(def);
  }

  // Override _clone() to preserve MyPlugin through the chain
  protected _clone(def: ConvexBuilderDef<any, any, any>): any {
    return new MyPlugin(def);
  }

  // Add custom methods
  myCustomMethod(param: string) {
    console.log("Custom method called with:", param);
    return this;
  }
}
```

Usage:

```ts
export const myQuery = convex
  .query()
  .extend(MyPlugin)
  .myCustomMethod("hello")     // Custom method from plugin
  .use(authMiddleware)          // .use() preserves MyPlugin type
  .input({ count: v.number() })
  .handler(async (ctx, input) => { ... })
  .public();
```

### Composing Multiple Plugins

Plugins can be composed with `.extend()`:

```ts
export const myQuery = convex
  .query()
  .extend(MyPlugin)
  .extend(WithZod) // WithZod overrides .input()/.returns() from MyPlugin
  .myCustomMethod("hello")
  .input(z.object({ count: z.number() }))
  .handler(async (ctx, input) => { ... })
  .public();
```

## Flexible Method Ordering

The builder API is flexible about method ordering, allowing you to structure your code in the way that makes the most sense for your use case.

### Middleware After Handler

You can add middleware **after** defining the handler, which is useful when you want to wrap existing handlers with additional functionality:

```ts
export const getNumbers = convex
  .query()
  .input({ count: v.number() })
  .handler(async (context, input) => {
    return await context.db.query("numbers").take(input.count);
  })
  .use(authMiddleware) // Middleware added after handler
  .public();
```

### Callable Builders

Before registering a function with `.public()` or `.internal()`, the builder is **callable** -- you can invoke it directly from other handlers (see [Reusable Chains](#reusable-chains--callables) above) or use it in tests:

```ts
// A callable (not yet registered)
const getDouble = convex
  .query()
  .input({ count: v.number() })
  .handler(async (context, input) => {
    return { doubled: input.count * 2 };
  });

// Call it from another handler
export const tripled = convex
  .query()
  .input({ count: v.number() })
  .handler(async (ctx, input) => {
    const { doubled } = await getDouble(ctx, input);
    return { tripled: doubled + input.count };
  })
  .public();

// Or call it directly in tests
const mockContext = {} as any;
const result = await getDouble(mockContext, { count: 5 });
console.log(result); // { doubled: 10 }

// Register it when you also need it as a standalone endpoint
export const doubleNumber = getDouble.public();
```

### Method Ordering Rules

- **`.returns()`** must be called **before** `.handler()`
- **`.use()`** can be called **before or after** `.handler()`
- **`.public()`** or **`.internal()`** must be called **after** `.handler()` and is **required** to register the function
- Functions are **callable** before registration, **non-callable** after registration
- **All exported functions must end with `.public()` or `.internal()`** - functions without registration will not be available in your Convex API

## API

### Methods

- `.query()` - Define a Convex query
- `.mutation()` - Define a Convex mutation
- `.action()` - Define a Convex action
- `.public()` - Register the function as public (required to register)
- `.internal()` - Register the function as internal/private (required to register)
- `.input(validator)` - Set input validation (Convex validators)
- `.returns(validator)` - Set return validation (Convex validators)
- `.use(middleware)` - Apply middleware
- `.createMiddleware(fn)` - Create a middleware function
- `.handler(fn)` - Define the function handler
- `.extend(plugin)` - Extend the builder with a plugin class

## Caveats

### Circular types when calling `api.*` in the same file

When a function calls other functions via `api.*` in the same file, and those functions don't have explicit `.returns()` validators, TypeScript may report circular initializer errors (TS7022). This is a standard Convex/TypeScript limitation, not specific to fluent-convex. Workarounds:
1. Add `.returns()` to the **called** functions -- this gives them explicit return types, breaking the cycle
2. Move the calling function to a separate file
3. Use `internal.*` from a different module

## Documentation

The **[live docs site](https://friendly-zebra-716.convex.site)** is an interactive showcase that demonstrates every feature with working live demos. The code snippets shown on the docs site are the actual source code powering the app -- imported via Vite `?raw` imports, so what you see is what runs.

Sections:
- [Getting Started](https://friendly-zebra-716.convex.site/) -- builder setup and overview
- [Basics](https://friendly-zebra-716.convex.site/basics) -- queries, mutations, and the fluent chain
- [Validation](https://friendly-zebra-716.convex.site/validation) -- property validators, object validators, and Zod schemas
- [Middleware](https://friendly-zebra-716.convex.site/middleware) -- context-enrichment and onion middleware
- [Reusable Chains](https://friendly-zebra-716.convex.site/reusable-chains) -- callable syntax and composability
- [Zod Plugin](https://friendly-zebra-716.convex.site/zod-plugin) -- runtime refinement validation
- [Custom Plugins](https://friendly-zebra-716.convex.site/custom-plugins) -- building your own plugins with `.extend()`



The docs source lives in [`/apps/docs`](./apps/docs) and is auto-deployed on every push to `main`.

## Development

This is a monorepo using npm workspaces:

- `/packages/fluent-convex` - The core library (includes the Zod plugin at `fluent-convex/zod`)
- `/apps/example` - Example Convex app
- `/apps/docs` - Interactive docs & showcase site ([live](https://friendly-zebra-716.convex.site))

### Setup

```bash
npm install
```

This will install dependencies for all workspaces.

### Building

```bash
npm run build
```

### Running tests

```bash
npm test
```

### Running the example

```bash
cd apps/example
npm run dev
```

### Running the docs locally

```bash
npm run docs:dev
```

## Credits

Borrowed heavily from [oRPC](https://orpc.unnoq.com/learn-and-contribute/overview) and helped out by AI.
