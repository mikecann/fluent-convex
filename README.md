# Fluent Convex

A fluent API builder for Convex functions with middleware support, inspired by [oRPC](https://orpc.unnoq.com/).

## Features

- 🔄 **Middleware support** - Compose reusable middleware for authentication, logging, and more
- 🎯 **Type-safe** - Full TypeScript support with type inference
- ✨ **Fluent API** - Chain methods for a clean, readable syntax
- 🔌 **Zod integration** - Use Zod schemas alongside Convex validators
- 🚀 **Works with Convex** - Built on top of Convex's function system

## Installation

```bash
npm install fluent-convex convex convex-helpers zod
```

## Quick Start

```ts
import { cvx } from "fluent-convex";
import { v } from "convex/values";

// Simple query
export const listNumbers = cvx
  .query()
  .input({ count: v.number() })
  .handler(async ({ context, input }) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return { numbers: numbers.map((n) => n.value) };
  });

// With middleware
const authMiddleware = cvx.query().middleware(async ({ context, next }) => {
  const identity = await context.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }

  return next({
    context: {
      ...context,
      user: {
        id: identity.subject,
        name: identity.name ?? "Unknown",
      },
    },
  });
});

export const listNumbersAuth = cvx
  .query()
  .use(authMiddleware)
  .input({ count: v.number() })
  .handler(async ({ context, input }) => {
    const numbers = await context.db
      .query("numbers")
      .order("desc")
      .take(input.count);

    return {
      viewer: context.user.name, // user is available from middleware!
      numbers: numbers.map((n) => n.value),
    };
  });
```

## Using Zod

```ts
import { z } from "zod";
import { cvx } from "fluent-convex";

export const listNumbersWithZod = cvx
  .query()
  .input(
    z.object({
      count: z.number().int().min(1).max(100),
    })
  )
  .handler(async ({ context, input }) => {
    // input.count is properly typed as number
    const numbers = await context.db.query("numbers").take(input.count);

    return { numbers: numbers.map((n) => n.value) };
  });
```

## API

### Methods

- `.query()` - Define a Convex query
- `.mutation()` - Define a Convex mutation
- `.action()` - Define a Convex action
- `.internal()` - Make the function internal (private)
- `.input(validator)` - Set input validation (Convex or Zod)
- `.returns(validator)` - Set return validation (Convex or Zod)
- `.use(middleware)` - Apply middleware
- `.middleware(fn)` - Create a middleware function
- `.handler(fn)` - Define the function handler

## Example

Check out the `/example` directory for a complete working example with various use cases including:

- Simple queries and mutations
- Middleware composition
- Zod integration
- Internal functions
- Type-safe context transformations

## Development

This is a monorepo structure:

- `/src` - The npm package source code
- `/example` - Example Convex app using the package

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
cd example
npm install
npm run dev
```

## Credits

Borrowed heavily from [oRPC](https://orpc.unnoq.com/learn-and-contribute/overview) and helped out by AI.
