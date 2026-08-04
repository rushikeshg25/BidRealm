import { defineConfig, type Options } from "tsup";

export default defineConfig((options: Options) => ({
  entryPoints: ["src/index.ts"],
  clean: true,
  format: ["cjs"],
  // @repo/* workspace packages publish raw TypeScript, so they must be bundled
  // rather than left as a runtime require Node cannot parse.
  noExternal: [/^@repo\//],
  ...options,
}));
