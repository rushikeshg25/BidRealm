'use client';

import { authClient } from '@/lib/auth-client';
import { signInSchema } from '@/types/auth';

export type AuthResult = { ok: true } | { ok: false; error: string };
const GENERIC_FAILURE = 'Email or password is incorrect.';

const signIn = async (formData: unknown): Promise<AuthResult> => {
  const parsed = signInSchema.safeParse(formData);
  if (!parsed.success) return { ok: false, error: GENERIC_FAILURE };

  try {
    const { error } = await authClient.signIn.email(parsed.data);
    if (error) return {
      ok: false,
      error: error.status === 429 ? 'Too many attempts. Try again shortly.' : GENERIC_FAILURE,
    };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not connect. Try again.' };
  }
};

export default signIn;
