import { v } from "convex/values";
import { convex } from "./lib";
import { addTimestamp, addValueMiddleware } from "./middleware";

const lib = {
  listNumbers: convex
    .query()
    .input({ count: v.number() })
    .use(addTimestamp)
    .handler(async ({ context, input }) => {
      const numbers = await context.db
        .query("numbers")
        .order("desc")
        .take(input.count);

      return {
        numbers: numbers.reverse().map((number) => number.value),
        timestamp: context.timestamp,
      };
    }),
};

export const listNumbersSimple3 = lib.listNumbers
  .use(addValueMiddleware(42))
  .public();

// This demonstrates the desired callable function feature
// Currently commented out because the builder doesn't support it yet
export const doSomethingWithNumbers = convex
  .query()
  .use(addTimestamp)
  .input({ count: v.number() })
  .handler(async ({ context, input }) => {
    const { numbers } = await lib.listNumbers(context)(input);

    return numbers.map((n) => String(n)).join(", ");
  })
  .public();
