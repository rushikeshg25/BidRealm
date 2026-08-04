import { PageShell } from '@/components/PageShell';
import { AuctionsSkeleton } from '@/components/pages/Auctions';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * The app had no loading.tsx anywhere, so every server-rendered navigation --
 * search, filter, pagination -- blocked on a blank screen with no feedback.
 */
export default function Loading() {
  return (
    <PageShell width='wide'>
      <div className='grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]'>
        <div className='hidden md:block'>
          <div className='space-y-4 rounded-lg border bg-card p-4'>
            <Skeleton className='h-4 w-16' />
            <div className='space-y-3'>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className='h-9 w-full' />
              ))}
            </div>
          </div>
        </div>
        <AuctionsSkeleton />
      </div>
    </PageShell>
  );
}
