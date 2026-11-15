import { type GenericDataModel } from "convex/server";
import { ConvexBuilder } from "./ConvexBuilder.js";

export function createBuilder<
  TDataModel extends GenericDataModel,
>(): ConvexBuilder<TDataModel> {
  return new ConvexBuilder<TDataModel>({
    middlewares: [],
  });
}
