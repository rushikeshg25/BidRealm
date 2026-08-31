/**
 * One runner for the whole monorepo. Each project keeps its tests next to the
 * code they cover, so a rule and its cases move together.
 */
export default [
  'packages/ws-auth',
  'packages/db',
  'apps/server',
  'apps/client',
];
