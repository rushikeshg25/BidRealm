'use client';

import { authClient } from '@/lib/auth-client';
import { signUpSchema } from '@/types/auth';
import type { AuthResult } from './Signin';

const signUp = async (formData: unknown): Promise<AuthResult> => {
  const parsed = signUpSchema.safeParse(formData);
  if (!parsed.success) return {
    ok: false,
    error: parsed.error.issues[0]?.message ?? 'Check the form and try again.',
  };

  const { userName, email, password } = parsed.data;
  try {
    const { error } = await authClient.signUp.email({ name: userName, email, password });
    if (error) return {
      ok: false,
      error: error.status === 429
        ? 'Too many attempts. Try again shortly.'
        : 'Could not create the account. Try another username or sign in.',
    };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not connect. Try again.' };
  }
};

export { signUp };
