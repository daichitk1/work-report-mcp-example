import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// MCP Apps Resourceは1つのHTML文字列として配信するため、単一fileへbundleする。
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  server: {
    port: 5173,
  },
});
