import { defineConfig, devices } from "@playwright/test";
import { proxyFromEnv } from "./e2e/proxy";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:4173",
    screenshot: "only-on-failure",
    proxy: proxyFromEnv(),
    launchOptions: {
      // 偽のカメラの映像を使い、カメラの許可の確認を出さない
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
    },
  },
  webServer: {
    // vite preview は dist を配るだけなので、先に pnpm build を済ませておく
    command: "pnpm exec vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: true,
  },
});
