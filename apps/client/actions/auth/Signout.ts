'use server';

import { getAuth, lucia } from '@/lib/auth';
import { cookies } from 'next/headers';

const Signout = async (): Promise<void> => {
  const { session } = await getAuth();
  if (!session) return;

  await lucia.invalidateSession(session.id);
  const sessionCookie = lucia.createBlankSessionCookie();
  cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
};

export default Signout;
