import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
export default defineConfig({
  testDir: "./e2e",
  timeout: 120000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5173", trace: "retain-on-failure" },
  webServer: [
    {
      command: "node scripts/test-server.js",
      cwd: resolve(process.env.ERP_SERVER_DIR || "../backend"),
      url: "http://127.0.0.1:4000/api/v1/health",
      timeout: 180000,
    },
    {
      command: "npm run dev",
      url: "http://127.0.0.1:5173",
      env: { VITE_API_BASE_URL: "http://127.0.0.1:4000/api/v1" },
      timeout: 60000,
    },
  ],
});
