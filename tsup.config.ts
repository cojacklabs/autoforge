import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/cli/index.ts" },
  outDir: "dist",
  format: ["esm"],
  platform: "node",
  target: "node20",
  bundle: true,
  external: ["yaml"],
  clean: true,
  dts: false,
  minify: false,
  sourcemap: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
