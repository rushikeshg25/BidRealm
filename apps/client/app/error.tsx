'use client';

import { useEffect } from 'react';
import { RotateCw } from 'lucide-react';

import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';

/**
 * Without an error boundary, any thrown error -- a database timeout, a bad query --
 * surfaced as Next's default error page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <div className='flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center'>
        <h1 className='text-2xl font-semibold'>Something went wrong</h1>
        <p className='max-w-md text-sm text-muted-foreground'>
          We could not load this page. This is usually temporary — try again in a
          moment.
        </p>
        {/* The digest is the only handle on the server-side log for this error. */}
        {error.digest ? (
          <p className='text-xs text-muted-foreground'>
            Reference: <code className='tabular'>{error.digest}</code>
          </p>
        ) : null}
        <Button onClick={reset} className='mt-2 gap-2'>
          <RotateCw className='h-4 w-4' />
          Try again
        </Button>
      </div>
    </PageShell>
  );
}
