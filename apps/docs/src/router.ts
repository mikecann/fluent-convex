import { createRouter, defineRoute } from "type-route";

// Vite's BASE_URL reflects the `base` the app was built with (e.g. "/" for the
// Convex self-hosted deploy, "/fluent-convex/" for the convex-labs deploy).
// type-route wants it without the trailing slash, and "" when mounted at root.
const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");

export const { RouteProvider, useRoute, routes } = createRouter(
  { baseUrl },
  {
    gettingStarted: defineRoute("/"),
    validation: defineRoute("/validation"),
    middleware: defineRoute("/middleware"),
    reusableChains: defineRoute("/reusable-chains"),
    zodPlugin: defineRoute("/zod-plugin"),
    customPlugins: defineRoute("/custom-plugins"),
  },
);
