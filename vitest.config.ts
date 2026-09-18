import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["Tests/App/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "Tests/coverage/App",
      reporter: ["text", "html"],
      include: [
        "App/utils/analyticsHelpers.ts",
        "App/utils/budgetHelpers.ts",
        "App/utils/suggestions.ts",
      ],
    },
  },
});
