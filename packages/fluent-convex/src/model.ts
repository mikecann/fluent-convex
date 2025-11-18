import type { GenericDataModel, GenericQueryCtx } from "convex/server";
import type { ConvexBuilder } from "./builder";
import { ConvexBuilderWithHandler } from "./builder";
import { getMethodMetadataFromClass } from "./decorators";
import type { QueryCtx } from "./types";

/**
 * Base class for query models that can be used with fluent-convex
 * Extend this class and use @input and @returns decorators on methods
 */
export abstract class QueryModel<
  TDataModel extends GenericDataModel = GenericDataModel,
> {
  constructor(protected context: GenericQueryCtx<TDataModel>) {}
}

/**
 * Extract DataModel from a QueryModel constructor
 */
type ExtractDataModelFromConstructor<T> = T extends new (
  context: GenericQueryCtx<infer D>
) => any
  ? D
  : never;

/**
 * Internal helper to create a builder from a model method
 * This extracts the logic that was previously in ConvexBuilder.fromModel
 */
function createBuilderFromModel<
  TDataModel extends GenericDataModel,
  TModel extends new (context: QueryCtx<TDataModel>) => any,
  TMethodName extends keyof InstanceType<TModel>,
>(
  ModelClass: TModel,
  methodName: TMethodName,
  _builder: ConvexBuilder<TDataModel>
): ConvexBuilderWithHandler<
  TDataModel,
  "query",
  QueryCtx<TDataModel>,
  QueryCtx<TDataModel>,
  any,
  any,
  "public",
  any
> {
  // Get metadata from the decorated method
  const metadata = getMethodMetadataFromClass(ModelClass, methodName as string);

  // Set default handler that instantiates the model and calls the method
  const defaultHandler = async (context: QueryCtx<TDataModel>, input: any) => {
    const model = new ModelClass(context);
    const method = (model as any)[methodName];
    if (typeof method !== "function") {
      throw new Error(
        `Method '${String(methodName)}' is not a function on ${ModelClass.name}`
      );
    }
    return await method.call(model, input);
  };

  // Return a builder that already has a handler set
  // This matches the original fromModel implementation
  return new ConvexBuilderWithHandler<
    TDataModel,
    "query",
    QueryCtx<TDataModel>,
    QueryCtx<TDataModel>,
    typeof metadata.inputValidator,
    typeof metadata.returnsValidator,
    "public",
    any
  >({
    functionType: "query",
    middlewares: [],
    argsValidator: metadata.inputValidator,
    returnsValidator: metadata.returnsValidator,
    visibility: "public",
    handler: defaultHandler as any,
  }) as any;
}

/**
 * Builder for model methods that can be bound to a ConvexBuilder instance
 */
class ModelMethodBuilder<
  TDataModel extends GenericDataModel,
  TModel extends new (context: QueryCtx<TDataModel>) => any,
  TMethodName extends keyof InstanceType<TModel>,
> {
  private middlewares: any[] = [];

  constructor(
    private ModelClass: TModel,
    private methodName: TMethodName
  ) {}

  /**
   * Use middleware - stores middleware for later application
   */
  use(middleware: any): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Register as public function
   * Builder must be provided here
   */
  public(builder: ConvexBuilder<TDataModel>) {
    // Create builder from model using the extracted helper
    const result = createBuilderFromModel(
      this.ModelClass,
      this.methodName,
      builder
    );
    // Apply all middlewares
    let current: any = result;
    for (const middleware of this.middlewares) {
      current = current.use(middleware);
    }
    return current.public();
  }

  /**
   * Register as internal function
   * Builder must be provided here
   */
  internal(builder: ConvexBuilder<TDataModel>) {
    // Create builder from model using the extracted helper
    const result = createBuilderFromModel(
      this.ModelClass,
      this.methodName,
      builder
    );
    // Apply all middlewares
    let current: any = result;
    for (const middleware of this.middlewares) {
      current = current.use(middleware);
    }
    return current.internal();
  }
}

/**
 * Create a fluent builder from a decorated model method
 * Infers DataModel from the QueryModel class
 * Usage:
 *   toFluent(MyQueryModel, "listNumbers").use(middleware).public(convex)
 */
export function toFluent<
  TModel extends new (context: GenericQueryCtx<any>) => any,
  TMethodName extends keyof InstanceType<TModel>,
>(
  ModelClass: TModel,
  methodName: TMethodName
): ModelMethodBuilder<
  ExtractDataModelFromConstructor<TModel>,
  TModel,
  TMethodName
> {
  return new ModelMethodBuilder<
    ExtractDataModelFromConstructor<TModel>,
    TModel,
    TMethodName
  >(ModelClass, methodName);
}
