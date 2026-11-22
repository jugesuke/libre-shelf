import { defineConfig, devices } from "@playwright/test";
import { proxyFromEnv } from "./e2e/proxy";

// 部品のテスト用。Storybook のビルド（storybook-static）を配って開く。
// 先に `pnpm build-storybook -o storybook-static` を済ませておく
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:6007",
    screenshot: "only-on-failure",
    proxy: proxyFromEnv(),
  },
  webServer: {
    command: "python3 -m http.server 6007 --bind 127.0.0.1 --directory storybook-static",
    url: "http://localhost:6007",
    stderr: "ignore",
    reuseExistingServer: true,
  },
});
