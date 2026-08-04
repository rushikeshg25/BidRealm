'use server';

import { lucia } from '@/lib/auth';
import { ActionResult, failed, unexpected } from '@/lib/actionResult';
import { signUpSchema } from '@/types/auth';
import prisma from '@repo/db';
import * as argon2 from 'argon2';
import { generateId } from 'lucia';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const signUp = async (formData: unknown): Promise<ActionResult> => {
  // signUpSchema was typed on the parameter but never run. Notably it also had
  // `password: z.string()` with no minimum length, while signInSchema required
  // eight characters -- so an account could be created with a password its owner
  // could then never use to sign in.
  const parsed = signUpSchema.safeParse(formData);
  if (!parsed.success) {
    return failed(
      parsed.error.issues[0]?.message ?? 'Please check the form and try again.'
    );
  }

  const { userName, email, password } = parsed.data;

  try {
    // Two separate findUnique round trips, and a race between them and the
    // create. Let the unique constraints decide instead, and translate the
    // violation into a field-specific message.
    const hashedPassword = await argon2.hash(password);
    const userId = generateId(15);

    try {
      await prisma.user.create({
        data: { id: userId, userName, email, hashedPassword },
      });
    } catch (error) {
      const target = uniqueConstraintTarget(error);
      if (target === 'userName') return failed('That username is taken.');
      if (target === 'email')
        return failed('An account with that email already exists.');
      throw error;
    }

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );
  } catch (error) {
    return unexpected('signUp', error);
  }

  redirect('/');
};

/** Reads the offending field out of Prisma's P2002 unique-constraint error. */
const uniqueConstraintTarget = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as { code?: unknown; meta?: { target?: unknown } };
  if (candidate.code !== 'P2002') return null;

  const target = candidate.meta?.target;
  if (Array.isArray(target)) return typeof target[0] === 'string' ? target[0] : null;
  return typeof target === 'string' ? target : null;
};

export { signUp };
