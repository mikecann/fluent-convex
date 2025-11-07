import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.ts", "convex/**/*.{test,spec}.ts"],
    typecheck: {
      tsconfig: "./tsconfig.app.json",
    },
  },
});
