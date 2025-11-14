import { v } from 'convex/values'
import { convex } from './lib'
import { authMiddleware } from './middleware'
import { api } from './_generated/api'

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// You can read data from the database via a query:
export const listNumbers = convex
  .query()
  .input({ count: v.number() })
  .handler(async ({ context, input }) => {
    // Read the database as many times as you need here.
    // See https://docs.convex.dev/database/reading-data.
    const numbers = await context.db
      .query('numbers')
      // Ordered by _creationTime, return most recent
      .order('desc')
      .take(input.count)
    return {
      viewer: (await context.auth.getUserIdentity())?.name ?? null,
      numbers: numbers.reverse().map((number) => number.value),
    }
  })

// You can write data to the database via a mutation:
export const addNumber = convex
  .mutation()
  .input({ value: v.number() })
  .returns(v.id('numbers'))
  .handler(async ({ context, input }) => {
    // Insert or modify documents in the database here.
    // Mutations can also read from the database like queries.
    // See https://docs.convex.dev/database/writing-data.

    const id = await context.db.insert('numbers', { value: input.value })

    console.log('Added new document with id:', id)
    return id
  })

// A query that requires authentication
export const listNumbersAuth = convex
  .query()
  .use(authMiddleware)
  .input({ count: v.number() })
  .handler(async ({ context, input }) => {
    const numbers = await context.db
      .query('numbers')
      .order('desc')
      .take(input.count)

    return {
      viewer: context.user.name, // user is available from middleware!
      numbers: numbers.reverse().map((number) => number.value),
    }
  })

// You can fetch data from and send data to third-party APIs via an action:
export const myAction = convex
  .action()
  .input({ first: v.number() })
  .handler(async ({ context, input }) => {
    // // Use the browser-like `fetch` API to send HTTP requests.
    // // See https://docs.convex.dev/functions/actions#calling-third-party-apis-and-using-npm-packages.
    // const response = await context.fetch("https://api.thirdpartyservice.com");
    // const data = await response.json();

    // // Query data by running Convex queries.
    const data = await context.runQuery(api.myFunctions.listNumbers, {
      count: 10,
    })
    console.log(data)

    // // Write data by running Convex mutations.
    await context.runMutation(api.myFunctions.addNumber, {
      value: input.first,
    })
  })
