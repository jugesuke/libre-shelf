import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// Storybook が読む設定。部品を描くだけなので、Worker を動かすプラグインは入れない
export default defineConfig({
  plugins: [tailwindcss(), react()],
});
