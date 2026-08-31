'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

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
    <div className='mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center'>
      <p className='font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground'>
        Something broke
      </p>
      <h1 className='font-display text-2xl font-semibold'>
        The saleroom did not load
      </h1>
      <p className='text-sm text-muted-foreground'>
        This is on us, not on you. Try again, and if it keeps happening the
        catalogue is temporarily unavailable.
      </p>
      <Button className='mt-2' onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
