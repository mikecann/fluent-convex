import { httpRouter } from "convex/server";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
import { components } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

// Auth routes (Convex Auth)
auth.addHttpRoutes(http);

// Serve static files at root with SPA fallback. The app router keeps owning
// "/" (rather than the component's own HTTP handler) so the Convex Auth routes
// above stay at their root URLs. Exact routes win over this catch-all.
registerStaticRoutes(http, components.selfHosting);

export default http;
