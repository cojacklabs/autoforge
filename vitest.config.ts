import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    passWithNoTests: false,
    clearMocks: true,
    maxWorkers: 4,
    testTimeout: 15_000,
  },
});
