import { v } from "convex/values";
import { convex } from "./lib";
import { addTimestamp, addValueMiddleware } from "./middleware";
import { QueryCtx } from "./_generated/server";
import { input, returns, makeCallableMethods } from "fluent-convex";

class MyQueryModel {
  constructor(private context: QueryCtx) {}

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

// Registered public functions that use callable helpers

// Query that uses callable query helpers
export const getNumbersWithStats = convex
  .query()
  .input({ count: v.number() })
  .use(addTimestamp)
  .handler(async ({ context, input }) => {
    // Create a callable version of the model where all decorated methods are automatically validated
    const model = makeCallableMethods(new MyQueryModel(context));

    const numbers = await model.listNumbers({ count: input.count });
    const numbersCount = await model.countNumbers({ count: input.count });

    return {
      numbers,
      numbersCount,
    };
  })
  .public();

export const getNumbersWithStatsFromModel = fromModel(
  MyQueryModel,
  "listNumbers",
)
  .use(addTimestamp)
  .public();
