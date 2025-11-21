import { v } from "convex/values";
import {
  ConvexBuilderWithFunctionKind,
  ConvexArgsValidator,
  ConvexReturnsValidator,
  Context,
  EmptyObject,
  FunctionType,
  GenericDataModel,
} from "fluent-convex";
import { convex } from "./lib";

// Define a custom builder extension
export class LoggedBuilder<
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
  constructor(
    builder: ConvexBuilderWithFunctionKind<
      TDataModel,
      TFunctionType,
      TCurrentContext,
      TArgsValidator,
      TReturnsValidator
    >,
  ) {
    super(builder.def);
  }

  /**
   * A custom method that adds a logging middleware and sets a standardized return type.
   */
  withStandardLogging(operationName: string) {
    console.log(`Building operation: ${operationName}`);

    // Add logging middleware
    const withMiddleware = this.use(async (ctx, next) => {
      console.log(`[${operationName}] Starting execution...`);
      const start = Date.now();
      try {
        const result = await next(ctx);
        const duration = Date.now() - start;
        console.log(`[${operationName}] Completed in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        console.error(`[${operationName}] Failed after ${duration}ms`, error);
        throw error;
      }
    });

    // Return the new builder instance (important!)
    return withMiddleware;
  }
}

// Example usage of the extended builder
export const extendedQuery = convex
  .query()
  .extend(LoggedBuilder)
  .withStandardLogging("MyExtendedQuery")
  .input({ echo: v.string() })
  .handler(async (ctx, args) => {
    return `Echo: ${args.echo}`;
  })
  .public();
