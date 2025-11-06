// vite.config.js
import { defineConfig } from "vite";
import copy from "rollup-plugin-copy";

export default defineConfig({
  base: "",
  esbuild: {
    target: "esnext",
  },
  build: {
    target: "esnext",
    outDir: "dist",
    modulePreload: false,
  },
  plugins: [
    copy({
      targets: [
        { src: "src/preloaded_routes/*", dest: "dist/routes" },
        { src: "src/source_tiles/*", dest: "dist/charts" },
      ],
      hook: "writeBundle",
    }),
  ],
});
