/**
 * This package was previously a single `createEnv` call that nothing imported.
 *
 * It could not have worked if it had been imported: `REDIS_PORT: z.number()`
 * validates against `process.env`, whose values are always strings, so it could
 * only ever fail; and `clientPrefix: "PUBLIC_"` is not the prefix Next inlines
 * (`NEXT_PUBLIC_`). It also declared every variable in one schema, so the Next
 * app would have been required to define the email worker's Redis credentials.
 *
 * Each app now validates only the variables it actually reads, via its own
 * export path — importing one does not force the others' schemas to pass.
 */
export const ENV_PACKAGE_README = `
  import { serverEnv } from "@repo/env/server"; // apps/server
  import { clientEnv } from "@repo/env/client"; // apps/client
  import { emailEnv } from "@repo/env/email";   // apps/email-notification-server
`;
