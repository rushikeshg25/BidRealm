import { defineConfig, type Options } from "tsup";

export default defineConfig((options: Options) => ({
  entryPoints: ["src/index.ts"],
  clean: true,
  format: ["cjs"],
  // Workspace packages export TypeScript sources, so they must be bundled --
  // left external, Node would try to require a .ts file at runtime.
  noExternal: [/^@repo\//],
  ...options,
}));
