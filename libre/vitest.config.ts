import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import tsconfigPaths from "vite-tsconfig-paths";

// vitest-pool-workers はテストごとにストレージをスタックする際、内部リクエストの
// MF-Vitest-Source ヘッダーに describe / it 名を入れる。日本語で命名しているため
// ヘッダー値が非 ASCII になり、workerd が「非 ASCII を含む」という警告を stderr へ
// 大量に出す（実害はなく UTF-8 で通る）。プールがこの警告を出力するのはメインプロセスの
// process.stderr.write で、onConsoleLog も handleRuntimeStdio も差し替えられないため、
// 該当行だけを stderr の書き込み段でフィルタして抑制する。
const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
  if (
    typeof chunk === "string" &&
    chunk.includes('A header value for "MF-Vitest-Source"')
  ) {
    return true;
  }
  return (originalStderrWrite as (...args: unknown[]) => boolean)(chunk, ...rest);
}) as typeof process.stderr.write;

export default defineWorkersConfig(async () => {
  return {
    plugins: [tsconfigPaths({ projects: ["./tsconfig.base.json"] })],
    test: {
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.jsonc" },
          miniflare: {
            assets: {
              directory: "./public",
            },
          },
        },
      },
      include: [
        "worker/**/*.test.ts",
        "shared/**/*.test.ts",
        "src/**/*.test.ts",
      ],
    },
  };
});
