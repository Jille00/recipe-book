import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve the tsconfig "@/*" path alias natively.
  resolve: { tsconfigPaths: true },
  test: {
    // Pure logic runs in Node; files that need a DOM opt in with
    // `// @vitest-environment jsdom` at the top.
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
    restoreMocks: true,
    // Tests must never read the real database/env configuration.
    env: {
      NEXT_PUBLIC_APP_URL: "",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts", "app/site-url.ts", "components/recipe/*.ts", "hooks/**/*.ts"],
      exclude: ["**/*.test.ts", "lib/db/**", "lib/supabase/**"],
    },
  },
});
