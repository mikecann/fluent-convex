import { v } from "convex/values";
import { convex } from "./lib";
import { addTimestamp, addValueMiddleware, authMiddleware } from "./middleware";
import { QueryCtx } from "./_generated/server";
import {
  input,
  returns,
  makeCallableMethods,
  toFluent,
  QueryModel,
} from "fluent-convex";
import { GenericQueryCtx, Auth } from "convex/server";
import { DataModel } from "./_generated/dataModel.js";

class NumbersQueryModel extends QueryModel<DataModel> {
  @input({ count: v.number() })
  @returns(v.array(v.number()))
  async listNumbers({ count }: { count: number }) {
    const numbers = await this.context.db
      .query("numbers")
      .order("desc")
      .take(count);

    return numbers.map((n) => n.value);
  }

  @input({ count: v.number() })
  @returns(v.number())
  async countNumbers({ count }: { count: number }) {
    const numbers = await this.listNumbers({ count });
    return numbers.length;
  }
}

class NumbersQueryModelForUser extends QueryModel<DataModel> {
  constructor(
    context: QueryCtx,
    public userId: string,
    public numbersModel = new NumbersQueryModel(context),
  ) {
    super(context);
  }

  @input({ count: v.number() })
  @returns(v.array(v.number()))
  async listNumbers({ count }: { count: number }) {
    if (this.userId !== "123") throw new Error("Unauthorized");

    return this.numbersModel.listNumbers({ count });
  }
}

// Registered public functions that use callable helpers

// Query that uses callable query helpers
export const getNumbersWithStats = convex
  .query()
  .input({ count: v.number() })
  .use(addTimestamp)
  .handler(async ({ context, input }) => {
    // Create a callable version of the model where all decorated methods are automatically validated
    const model = makeCallableMethods(new NumbersQueryModel(context));

    const numbers = await model.listNumbers({ count: input.count });
    const numbersCount = await model.countNumbers({ count: input.count });

    return {
      numbers,
      numbersCount,
    };
  })
  .public();

export const listNumbersFromModel = toFluent(NumbersQueryModel, "listNumbers")
  .use(addTimestamp)
  .public();

const modelsMiddleware = convex
  .$context<QueryCtx & { user: { id: string } }>()
  .middleware(async ({ context, next }) => {
    return next({
      context: {
        ...context,
        models: {
          numbersForUser: new NumbersQueryModelForUser(
            context,
            context.user.id,
          ),
        },
      },
    });
  });

export const listNumbersFromModel2 = convex
  .query()
  .use(authMiddleware)
  .use(modelsMiddleware)
  .input({ count: v.number() })
  .handler(async ({ context, input }) =>
    context.models.numbersForUser.listNumbers({ count: input.count }),
  )
  .use(addTimestamp)
  .public();
