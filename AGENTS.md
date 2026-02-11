# AGENTS.md

Fluent builder for Convex functions with middleware. Monorepo: `packages/fluent-convex` (library) + `apps/example` (demo app).

## Testing

Always run **both** test suites after changes:

```bash
cd packages/fluent-convex && npx vitest run   # unit + type tests
cd apps/example && npx vitest run              # integration tests (convex-test)
```

If you add or rename exported functions in the example app, run `cd apps/example && npx convex codegen` first.

## Middleware is onion-style

`next()` executes the rest of the chain **including the handler**. Middleware can run code before/after, catch errors, and measure timing. Do not regress to a flat loop -- see `middleware-onion.test.ts`.

## Common pitfalls

- **Two execution paths**: `_call()` and `_register()` in `ConvexBuilderWithHandler` both use `_executeWithMiddleware`. Keep them in sync.
- **`extend()` uses prototype-based class detection** -- see `extend.ts`. Shared across all builder classes.
- **`ConvexBuilderWithHandler` constructor returns a function**, not `this`. `instanceof` will fail.
- **Zod refinements are not enforced server-side** -- `zodToConvex` only converts shape. Don't claim runtime Zod validation. Documented in `zod_support.ts` JSDoc and README.
- **Post-handler `.use()` breaks type safety** -- the handler's context type can't see middleware added after it, requiring `(context as any)` casts.
- **Circular types with `api.*` in same file** -- calling `api.myFunctions.X` in the same file without `.returns()` on the callees causes TS7022. This is a standard Convex/TS limitation, not fluent-convex specific. See commented-out example in `myFunctions.ts`.
