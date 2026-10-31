import { headers } from 'next/headers';
import { cache } from 'react';
import { auth } from './auth-service';

export const getAuth = cache(async () => {
  const result = await auth.api.getSession({ headers: await headers() });
  return result ?? { user: null, session: null };
});
