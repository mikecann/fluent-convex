import { createRouter, defineRoute } from "type-route";

export const { RouteProvider, useRoute, routes } = createRouter({
  gettingStarted: defineRoute("/"),
  validation: defineRoute("/validation"),
  middleware: defineRoute("/middleware"),
  reusableChains: defineRoute("/reusable-chains"),
  zodPlugin: defineRoute("/zod-plugin"),
  customPlugins: defineRoute("/custom-plugins"),
});
