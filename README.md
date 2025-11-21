# Fluent Convex

A fluent API builder for Convex functions with middleware support, inspired by [oRPC](https://orpc.unnoq.com/).

## Features

- 🔄 **Middleware support** - Compose reusable middleware for authentication, logging, and more
- 🎯 **Type-safe** - Full TypeScript support with type inference
- ✨ **Fluent API** - Chain methods for a clean, readable syntax
- 🔌 **Zod integration** - Use Zod schemas alongside Convex validators
- 🧩 **Extensible** - Extend the builder with your own custom methods
- 🚀 **Works with Convex** - Built on top of Convex's function system

## Installation

```bash
npm install fluent-convex convex zod
```

**Note:** `convex-helpers` is automatically installed as a dependency of `fluent-convex`, so you don't need to install it separately.

## Quick Start

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
  .public(); // ✅ Must end with .public() or .internal()

// With middleware
const authMiddleware = convex.query().middleware(async (context, next) => {
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
  .public(); // ✅ Must end with .public() or .internal()
```

## Using Zod

```ts
import { z } from "zod";
import { createBuilder } from "fluent-convex";
import type { DataModel } from "./_generated/dataModel";

const convex = createBuilder<DataModel>();

export const listNumbersWithZod = convex
  .query()
  .input(
    z.object({
      count: z.number().int().min(1).max(100),
    })
  )
  .handler(async (context, input) => {
    // input.count is properly typed as number
    const numbers = await context.db.query("numbers").take(input.count);

    return { numbers: numbers.map((n) => n.value) };
  })
  .public(); // ✅ Must end with .public() or .internal()
```

## Extensibility

You can extend the builder with your own custom methods by subclassing `ConvexBuilderWithFunctionKind` and using the `.extend()` method. This is powerful for adding domain-specific logic or shortcuts to your builder.

### 1. Define your Extended Builder

Subclass `ConvexBuilderWithFunctionKind` and add your custom methods.

```ts
import {
  ConvexBuilderWithFunctionKind,
  type GenericDataModel,
  type FunctionType,
  type Context,
  type EmptyObject,
  type ConvexArgsValidator,
  type ConvexReturnsValidator,
} from "fluent-convex";

class MyExtendedBuilder<
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
  // Constructor boilerplate to inherit types
  constructor(
    builder: ConvexBuilderWithFunctionKind<
      TDataModel,
      TFunctionType,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator
    >
  ) {
    super(builder.def);
  }

  // Add your custom method
  myCustomMethod(param: string) {
    // You can modify the builder, add middleware, or set validators
    console.log("Custom method called with:", param);
    return this;
  }
}
```

### 2. Use `.extend()`

Use `.extend()` to switch to your custom builder.

```ts
const myQuery = convex
  .query()
  // You can pass the class constructor directly:
  .extend(MyExtendedBuilder)
  // OR use a factory function:
  // .extend((builder) => new MyExtendedBuilder(builder))
  .myCustomMethod("hello") // ✅ Now you can call your method
  .input(v.object({}))
  .handler(async (ctx) => {
    return "success";
  });
```

## Flexible Method Ordering

The builder API is flexible about method ordering, allowing you to structure your code in the way that makes the most sense for your use case.

### Middleware After Handler

You can add middleware **after** defining the handler, which is useful when you want to wrap existing handlers with additional functionality:

```ts
const authMiddleware = convex.query().middleware(async (context, next) => {
  const identity = await context.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }
  return next({ ...context, userId: identity.subject });
});

// Middleware can be added after the handler
export const getNumbers = convex
  .query()
  .input({ count: v.number() })
  .handler(async (context, input) => {
    return await context.db.query("numbers").take(input.count);
  })
  .use(authMiddleware) // ✅ Middleware added after handler
  .public();
```

### Callable Builders (Testing)

Before registering a function with `.public()` or `.internal()`, the builder is **callable**, making it easy to test your functions:

```ts
// Create a callable query (not yet registered)
const testQuery = convex
  .query()
  .input({ count: v.number() })
  .handler(async (context, input) => {
    return { doubled: input.count * 2 };
  });

// You can call it directly for testing
const mockContext = {} as any;
const result = await testQuery(mockContext)({ count: 5 });
console.log(result); // { doubled: 10 }

// Once registered, it's no longer callable
export const doubleNumber = testQuery.public();
// doubleNumber(mockContext)({ count: 5 }); // ❌ TypeScript error - not callable
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
- `.input(validator)` - Set input validation (Convex or Zod)
- `.returns(validator)` - Set return validation (Convex or Zod)
- `.use(middleware)` - Apply middleware
- `.middleware(fn)` - Create a middleware function
- `.handler(fn)` - Define the function handler
- `.extend(fn)` - Extend the builder with a custom class

## Example

Check out the `/apps/example` directory for a complete working example with various use cases including:

- Simple queries and mutations
- Middleware composition
- Zod integration
- Internal functions
- Type-safe context transformations
- Custom builder extensions

## Development

This is a monorepo using npm workspaces:

- `/packages/fluent-convex` - The npm package source code
- `/apps/example` - Example Convex app using the package

### Setup

```bash
npm install
```

This will install dependencies for all workspaces.

### Building the package

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

## Credits

Borrowed heavily from [oRPC](https://orpc.unnoq.com/learn-and-contribute/overview) and helped out by AI.
