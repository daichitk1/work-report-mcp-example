import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/helpers/setup.ts"],
    include: ["tests/{unit,component,integration}/**/*.{test,spec}.{ts,tsx}"],
    restoreMocks: true,
  },
});
