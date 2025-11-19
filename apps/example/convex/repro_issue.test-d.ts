
import { api } from "./_generated/api";
import { FunctionReference, GenericQueryCtx } from "convex/server";
import { describe, it, expectTypeOf } from "vitest";

describe("Reproduction", () => {
  it("should assign to FunctionReference", () => {
    type MyQueryCtx = GenericQueryCtx<any>;
    const ctx: MyQueryCtx = {} as any;

    // This is what the user says fails
    ctx.runQuery(api.myFunctions.listNumbersSimple, { count: 10 });

    // Also try explicit assignment
    const ref: FunctionReference<"query", "public"> = api.myFunctions.listNumbersSimple;
  });

  it("should have _componentPath as undefined in api function reference", () => {
    const ref = api.myFunctions.listNumbersSimple;

    // Check if ref has _componentPath
    expectTypeOf(ref).toHaveProperty("_componentPath");
    
    // Check type of _componentPath
    // It should be undefined (after the fix)
    // Currently it is string | undefined, so this should fail
    expectTypeOf(ref._componentPath).toEqualTypeOf<undefined>();
  });
});

