import Link from 'next/link';

import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <PageShell>
      <div className='flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center'>
        <p className='text-sm font-medium text-primary'>404</p>
        <h1 className='text-2xl font-semibold'>We could not find that page</h1>
        <p className='max-w-md text-sm text-muted-foreground'>
          The auction may have been removed, or the link may be wrong.
        </p>
        <Button asChild className='mt-2'>
          <Link href='/'>Browse auctions</Link>
        </Button>
      </div>
    </PageShell>
  );
}
