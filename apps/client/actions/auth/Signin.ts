'use server';

import { lucia } from '@/lib/auth';
import { signInSchema } from '@/types/auth';
import prisma from '@repo/db';
import * as argon2 from 'argon2';
import { cookies } from 'next/headers';

export type AuthResult = { ok: true } | { ok: false; error: string };

/**
 * Returns a result rather than throwing. The raw messages this used to throw
 * ("User not found with Entered email") were piped straight into a toast, which
 * told anyone who asked whether a given address had an account. One message
 * covers both halves now.
 */
const GENERIC_FAILURE = 'Email or password is incorrect.';

const Signin = async (formData: unknown): Promise<AuthResult> => {
  const parsed = signInSchema.safeParse(formData);
  if (!parsed.success) return { ok: false, error: GENERIC_FAILURE };

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, hashedPassword: true },
    });
    if (!user) return { ok: false, error: GENERIC_FAILURE };

    const validPassword = await argon2.verify(
      user.hashedPassword,
      parsed.data.password
    );
    if (!validPassword) return { ok: false, error: GENERIC_FAILURE };

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    return { ok: true };
  } catch (error) {
    console.error('Sign in failed:', error);
    return { ok: false, error: 'Something went wrong. Try again.' };
  }
};

export default Signin;
