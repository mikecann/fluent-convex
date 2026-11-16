import { defineApp } from "convex/server";
import staticHosting from "@convex-dev/static-hosting/convex.config";

const app = defineApp();
// Keeps the instance name from @convex-dev/self-hosting 0.1, which this
// package replaced. With app-owned routing (registerStaticRoutes in http.ts)
// that let the 0.2 upgrade keep serving the old files until the first new
// upload, so the site never went down. Uploads need `--component selfHosting`.
// Renaming to the default means a fresh, empty component, so it would need the
// static-hosting migration guide's two-instance cutover.
app.use(staticHosting, { name: "selfHosting" });

export default app;
