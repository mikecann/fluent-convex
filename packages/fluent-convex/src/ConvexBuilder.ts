import type { GenericDataModel } from "convex/server";
import { ConvexBuilderDef } from "./types";
import { ConvexBuilderWithFunctionKind } from "./ConvexBuilderWithFunctionKind";
import type { ConvexMiddleware } from "./middleware";
import type {
  QueryCtx,
  MutationCtx,
  ActionCtx,
  Context,
  EmptyObject,
} from "./types";

export class ConvexBuilder<
  TDataModel extends GenericDataModel = GenericDataModel,
> {
  private def: ConvexBuilderDef;

  constructor(def: ConvexBuilderDef) {
    this.def = def;
  }

  extend<TResult>(fn: (builder: this) => TResult): TResult;
  extend<TResult>(cls: new (builder: this) => TResult): TResult;
  extend<TResult>(
    fnOrCls: ((builder: this) => TResult) | (new (builder: this) => TResult)
  ): TResult {
    try {
      return (fnOrCls as (builder: this) => TResult)(this);
    } catch (error: any) {
      if (
        error instanceof TypeError &&
        error.message.includes("Class constructor")
      ) {
        return new (fnOrCls as new (builder: this) => TResult)(this);
      }
      throw error;
    }
  }

  query(): ConvexBuilderWithFunctionKind<
    TDataModel,
    "query",
    QueryCtx<TDataModel>
  > {
    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      "query",
      QueryCtx<TDataModel>
    >({
      ...this.def,
      functionType: "query",
    });
  }

  mutation(): ConvexBuilderWithFunctionKind<
    TDataModel,
    "mutation",
    MutationCtx<TDataModel>
  > {
    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      "mutation",
      MutationCtx<TDataModel>
    >({
      ...this.def,
      functionType: "mutation",
    });
  }

  action(): ConvexBuilderWithFunctionKind<
    TDataModel,
    "action",
    ActionCtx<TDataModel>
  > {
    return new ConvexBuilderWithFunctionKind<
      TDataModel,
      "action",
      ActionCtx<TDataModel>
    >({
      ...this.def,
      functionType: "action",
    });
  }

  $context<U extends Context>(): {
    middleware<UOutContext extends Context>(
      middleware: ConvexMiddleware<U, UOutContext>
    ): ConvexMiddleware<U, UOutContext>;
  } {
    // Return an object that allows middleware creation with a specific context type
    return {
      middleware<UOutContext extends Context>(
        middleware: ConvexMiddleware<U, UOutContext>
      ): ConvexMiddleware<U, UOutContext> {
        return middleware;
      },
    };
  }

  middleware<UOutContext extends Context>(
    middleware: ConvexMiddleware<EmptyObject, UOutContext>
  ): ConvexMiddleware<EmptyObject, UOutContext>;
  middleware<UInContext extends Context, UOutContext extends Context>(
    middleware: ConvexMiddleware<UInContext, UOutContext>
  ): ConvexMiddleware<UInContext, UOutContext>;
  middleware<UInContext extends Context, UOutContext extends Context>(
    middleware: ConvexMiddleware<UInContext, UOutContext>
  ): ConvexMiddleware<UInContext, UOutContext> {
    return middleware;
  }
}
