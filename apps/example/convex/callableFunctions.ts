import { v } from "convex/values";
import { convex } from "./lib";
import { addTimestamp, addValueMiddleware } from "./middleware";

// Example: Simple query without middleware
export const listNumbersSimple = convex
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
  })
  .use(addValueMiddleware(42))
  .public();

// export const doSomethingWithNumbers = convex
//   .query()
//   .input({ count: v.number() })
//   .handler(async ({ context, input }) => {
//     const { numbers } = await listNumbersSimple(context)(input);

//     return numbers.map((n) => String(n)).join(", ");
//   })
//   .public();
