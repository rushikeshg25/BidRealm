'use server';

import { lucia } from '@/lib/auth';
import { ActionResult, failed, unexpected } from '@/lib/actionResult';
import { signInSchema } from '@/types/auth';
import prisma from '@repo/db';
import * as argon2 from 'argon2';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * The two failure branches used to throw distinct messages -- 'User not found
 * with Entered email' versus 'Invalid password' -- and both reached the browser
 * verbatim. That makes the sign-in form an account enumeration oracle: an
 * attacker learns which email addresses are registered. One message for both.
 */
const INVALID_CREDENTIALS = 'That email and password combination is incorrect.';

const Signin = async (formData: unknown): Promise<ActionResult> => {
  // signInSchema was named in the parameter's type but never actually run, so
  // validation existed in the browser only and a direct call could send anything.
  const parsed = signInSchema.safeParse(formData);
  if (!parsed.success) return failed(INVALID_CREDENTIALS);

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, hashedPassword: true },
    });

    if (!user) return failed(INVALID_CREDENTIALS);

    const validPassword = await argon2.verify(
      user.hashedPassword,
      parsed.data.password
    );

    if (!validPassword) return failed(INVALID_CREDENTIALS);

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );
  } catch (error) {
    return unexpected('signIn', error);
  }

  // Next implements redirect() by throwing NEXT_REDIRECT. This call used to sit
  // *inside* the try block, so every successful login was caught, logged as
  // "Error during sign in", and rethrown.
  redirect('/');
};

export default Signin;
