import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { projects: ['packages/ws-auth', 'packages/db', 'apps/server', 'apps/client'] },
});
