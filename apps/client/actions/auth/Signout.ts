'use client';

import { authClient } from '@/lib/auth-client';

const signOut = async (): Promise<void> => {
  const { error } = await authClient.signOut();
  if (error) throw new Error('Could not sign out. Try again.');
};

export default signOut;
