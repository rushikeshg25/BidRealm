'use server';

import { lucia } from '@/lib/auth';
import { signUpSchema } from '@/types/auth';
import prisma from '@repo/db';
import * as argon2 from 'argon2';
import { generateId } from 'lucia';
import { cookies } from 'next/headers';
import type { AuthResult } from './Signin';

const signUp = async (formData: unknown): Promise<AuthResult> => {
  const parsed = signUpSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Check the form and try again.',
    };
  }
  const { userName, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ userName }, { email }] },
      select: { userName: true, email: true },
    });
    if (existing) {
      return {
        ok: false,
        error:
          existing.userName === userName
            ? 'That username is taken.'
            : 'An account already exists for that email.',
      };
    }

    const userId = generateId(15);
    await prisma.user.create({
      data: { id: userId, userName, email, hashedPassword: await argon2.hash(password) },
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    return { ok: true };
  } catch (error) {
    console.error('Sign up failed:', error);
    return { ok: false, error: 'Something went wrong. Try again.' };
  }
};

export { signUp };
