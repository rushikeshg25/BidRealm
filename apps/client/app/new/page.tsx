import CreateAuction from '@/components/pages/CreateAuction';
import { getAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Create an auction' };

// Moved out of the `(createAuction)` route group, which wrapped this single route
// and supplied no layout of its own.
export default async function Page() {
  const { session } = await getAuth();
  if (!session) redirect('/sign-in?next=/new');

  // The `user` prop is gone: CreateAuction only used it to pass a userId to the
  // action, which now reads identity from the session.
  return <CreateAuction />;
}
