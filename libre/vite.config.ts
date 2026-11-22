import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";

import tsconfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

import { buildOgpMetaTags } from "./shared/ogp/meta-tags";

/**
 * ビルドのときの SITE_URL から OGP の meta を index.html の head に差し込む。
 */
const ogpMeta = (): Plugin => ({
  name: "libre-ogp-meta",
  transformIndexHtml: () => buildOgpMetaTags(process.env.SITE_URL),
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tsconfigPaths({ projects: ["./tsconfig.base.json"] }),
    tailwindcss(),
    react(),
    cloudflare(),
    ogpMeta(),
  ],
});
