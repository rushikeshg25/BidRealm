import { defineConfig, type Options } from "tsup";

export default defineConfig((options: Options) => ({
  entryPoints: ["src/index.ts"],
  clean: true,
  format: ["cjs"],
  // `@repo/*` workspace packages publish raw TypeScript (see the `exports` map in
  // packages/db/package.json). tsup externalises `dependencies` by default, which
  // would leave `require("@repo/db")` pointing at a .ts file that Node cannot
  // parse at runtime — so these have to be bundled rather than externalised.
  noExternal: [/^@repo\//],
  ...options,
}));
