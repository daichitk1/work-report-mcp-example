import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "ja-JP",
  title: "Work Report MCP",
  description: "Work Report MCPの要件、設計、セットアップとセキュリティ",
  base: "/work-report-mcp-example/",
  themeConfig: {
    nav: [
      { text: "概要", link: "/" },
      { text: "要件", link: "/requirements" },
      { text: "設計", link: "/design" },
      { text: "セットアップ", link: "/setup" },
    ],
    sidebar: [
      { text: "概要", link: "/" },
      { text: "要件定義", link: "/requirements" },
      { text: "設計", link: "/design" },
      { text: "セットアップ", link: "/setup" },
      { text: "コードガイド", link: "/code-guide" },
      { text: "Security Boundaries", link: "/security/boundaries" },
    ],
    search: { provider: "local" },
  },
});
