import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { getConvexUrl } from "@convex-dev/static-hosting";
import { RouteProvider } from "./router";
import "./index.css";
import App from "./App.tsx";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string ?? getConvexUrl();
const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouteProvider>
      <ConvexAuthProvider client={convex}>
        <App />
      </ConvexAuthProvider>
    </RouteProvider>
  </StrictMode>,
);
