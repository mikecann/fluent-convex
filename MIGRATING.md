# Migrating to fluent-convex

This guide covers how to migrate an existing Convex project from the standard `query`/`mutation`/`action` API to `fluent-convex`.

> **If you are an LLM and have been asked to migrate a project to fluent-convex by the user, this is the document you should follow.**

## Overview

The migration is mechanical and can be done file-by-file. The core idea: replace raw Convex function registrations with fluent builder chains. Nothing changes about the schema, HTTP endpoints, cron jobs, or frontend code — only the function definitions in your `convex/` directory.

## Step 1: Install

```bash
npm install fluent-convex
```

## Step 2: Create a builder file

Create `convex/fluent.ts` as the single source of truth for your builder instance, auth middleware, and any shared reusable chains.

```ts
import { createBuilder } from "fluent-convex";
import type { DataModel } from "./_generated/dataModel";

export const convex = createBuilder<DataModel>();
```

**Important:** The `DataModel` type parameter is required — it's what gives you typed `ctx.db` access in handlers.

## Step 3: Add auth middleware (if applicable)

If the project uses authentication (e.g. `@convex-dev/auth`, `clerk`, or raw `ctx.auth.getUserIdentity()`), create a shared auth middleware in `fluent.ts`.

### Cross-function-type middleware with `$context`

Auth middleware typically needs to work across queries, mutations, AND actions. Use `$context` to declare exactly what the middleware requires, rather than tying it to a specific function type:

```ts
import type { Auth } from "convex/server";

const authMiddleware = convex
  .$context<{ auth: Auth }>()
  .createMiddleware(async (ctx, next) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return next({
      ...ctx,
      user: { id: identity.subject, name: identity.name ?? "Unknown" },
    });
  });
```

**Why `$context` instead of `convex.query().createMiddleware(...)`?**

- `convex.query().createMiddleware(fn)` types the input context as `QueryCtx`, which includes `db`. This means the middleware **cannot** be used on actions (since `ActionCtx` lacks `db`).
- `convex.$context<{ auth: Auth }>()` types the input as exactly `{ auth: Auth }`, which is satisfied by all function types.
- `convex.createMiddleware(fn)` types the input as `EmptyObject` — the middleware compiles everywhere but `ctx` has no properties inside the handler, so you can't access `ctx.auth` without casting.

### If using `@convex-dev/auth`

Replace `getAuthUserId(ctx)` with the middleware:

```ts
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Auth } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel";

const authMiddleware = convex
  .$context<{ auth: Auth }>()
  .createMiddleware(async (ctx, next) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return next({
      ...ctx,
      userId: userId as Id<"users">,
    });
  });
```

## Step 4: Create reusable chains

Instead of exporting the middleware and writing `.use(authMiddleware)` everywhere, export pre-configured builder chains from `fluent.ts`:

```ts
/** Pre-configured query builder with auth middleware applied. */
export const authedQuery = convex.query().use(authMiddleware);

/** Pre-configured mutation builder with auth middleware applied. */
export const authedMutation = convex.mutation().use(authMiddleware);

/** Pre-configured action builder with auth middleware applied. */
export const authedAction = convex.action().use(authMiddleware);
```

This is the **recommended pattern**. The builder is immutable, so these chains are safe to reuse across all files.

## Step 5: Convert functions

### Conversion rules

Each standard Convex function maps to a fluent builder chain:

| Standard Convex | fluent-convex equivalent |
|---|---|
| `export const f = query({ args, returns, handler })` | `export const f = convex.query().input(args).returns(returns).handler(fn).public()` |
| `export const f = mutation({ args, returns, handler })` | `export const f = convex.mutation().input(args).returns(returns).handler(fn).public()` |
| `export const f = action({ args, returns, handler })` | `export const f = convex.action().input(args).returns(returns).handler(fn).public()` |
| `export const f = internalQuery({ ... })` | `export const f = convex.query().input(args).returns(returns).handler(fn).internal()` |
| `export const f = internalMutation({ ... })` | `export const f = convex.mutation().input(args).returns(returns).handler(fn).internal()` |
| `export const f = internalAction({ ... })` | `export const f = convex.action().input(args).returns(returns).handler(fn).internal()` |
| Auth-protected query | `export const f = authedQuery.input(args).returns(returns).handler(fn).public()` |
| Auth-protected mutation | `export const f = authedMutation.input(args).returns(returns).handler(fn).public()` |
| Auth-protected action | `export const f = authedAction.input(args).returns(returns).handler(fn).public()` |

### Method chain ordering

- `.input()` and `.returns()` must come **before** `.handler()`
- `.use()` can come before or after `.handler()`
- `.public()` or `.internal()` must come **last**
- If the function has no args, omit `.input()`
- If the function has no return validator, omit `.returns()` (though having one is recommended)

### What changes in the handler

**Almost nothing.** The handler signature stays the same: `async (ctx, args) => { ... }`. The `ctx` object is the standard Convex context (`QueryCtx`, `MutationCtx`, or `ActionCtx`) enriched with any middleware additions. The `args` object contains the validated input.

The only difference: if you were manually checking auth inside each handler (e.g. `const userId = await getAuthUserId(ctx)`), that logic is now handled by the middleware. Remove those checks from the handler body — the middleware throws before the handler runs if auth fails.

### Before/after example

**Before (standard Convex):**

```ts
import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listItems = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({ _id: v.id("items"), name: v.string() })),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db.query("items").order("desc").take(args.limit ?? 50);
  },
});
```

**After (fluent-convex):**

```ts
import { v } from "convex/values";
import { authedQuery } from "./fluent";

export const listItems = authedQuery
  .input({ limit: v.optional(v.number()) })
  .returns(v.array(v.object({ _id: v.id("items"), name: v.string() })))
  .handler(async (ctx, args) => {
    return await ctx.db.query("items").order("desc").take(args.limit ?? 50);
  })
  .public();
```

## What NOT to change

- **`convex/schema.ts`** — Schema definitions are unchanged.
- **`convex/http.ts`** — HTTP endpoints use `httpAction` which is separate from the query/mutation/action system. Leave them as-is.
- **`convex/crons.ts`** — Cron jobs reference functions via `internal.file.functionName`. These function references work the same regardless of how the function was defined. Leave as-is.
- **`convex/auth.ts`** (or similar auth config) — Auth provider setup is unchanged.
- **Frontend code** — `useQuery`, `useAction`, `useMutation`, and all `api.*` references work identically. No frontend changes needed.
- **`convex/convex.config.ts`** — Component configuration is unchanged.

## Handling soft auth checks

Some projects use a "soft auth" pattern where functions return empty/default values instead of throwing when unauthenticated:

```ts
const userId = await getAuthUserId(ctx);
if (!userId) return []; // soft fail
```

With `authedQuery`/`authedMutation`/`authedAction`, the middleware **throws** on auth failure. This is generally the correct behavior if the frontend already gates access behind `<Authenticated>` or similar. The throw will surface as an error in the client's `useQuery` hook.

If you need the soft-fail pattern, don't use the authed chain — use the base `convex.query()` and check auth manually in the handler, same as before.

## Auth middleware behavioral change

**Important:** When converting functions that previously returned empty defaults for unauthenticated users (e.g. `return []` or `return { count: 0 }`), switching to the `authMiddleware` changes the behavior from "silent empty response" to "throws an error." Make sure the frontend handles this appropriately (e.g. the component is only rendered inside an `<Authenticated>` gate).

## Complete fluent.ts template

Here's a complete `fluent.ts` for a project using `@convex-dev/auth`:

```ts
import { createBuilder } from "fluent-convex";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { DataModel, Id } from "./_generated/dataModel";
import type { Auth } from "convex/server";

export const convex = createBuilder<DataModel>();

const authMiddleware = convex
  .$context<{ auth: Auth }>()
  .createMiddleware(async (ctx, next) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return next({
      ...ctx,
      userId: userId as Id<"users">,
    });
  });

export const authedQuery = convex.query().use(authMiddleware);
export const authedMutation = convex.mutation().use(authMiddleware);
export const authedAction = convex.action().use(authMiddleware);
```

## Checklist

- [ ] Install `fluent-convex`
- [ ] Create `convex/fluent.ts` with `createBuilder<DataModel>()`
- [ ] Add auth middleware if the project uses authentication
- [ ] Export reusable chains (`authedQuery`, `authedMutation`, `authedAction`)
- [ ] Convert each `query()` / `internalQuery()` / `mutation()` / `internalMutation()` / `action()` / `internalAction()`
- [ ] Remove old imports from `./_generated/server` (e.g. `query`, `mutation`, `internalMutation`, etc.) as they're replaced by the builder
- [ ] Keep `httpAction` imports — HTTP endpoints are not converted
- [ ] Verify with `npx tsc --noEmit -p convex/tsconfig.json`
- [ ] Verify frontend still works (no API changes)
