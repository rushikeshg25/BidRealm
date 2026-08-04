'use server';

import { getAuth, lucia } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const Signout = async () => {
  const { session } = await getAuth();

  if (session) {
    await lucia.invalidateSession(session.id);
    const sessionCookie = lucia.createBlankSessionCookie();
    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );
  }

  // Neither of these happened before: the redirect was commented out and there
  // was no revalidation, so the cached RSC payload kept rendering a signed-in
  // navbar after logout.
  revalidatePath('/', 'layout');
  redirect('/sign-in');
};

export default Signout;
