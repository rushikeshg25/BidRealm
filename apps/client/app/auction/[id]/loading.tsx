import { PageShell } from '@/components/PageShell';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <PageShell>
      <div className='grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr]'>
        <div className='space-y-5'>
          <Skeleton className='aspect-[4/3] w-full rounded-lg' />
          <div className='space-y-3'>
            <Skeleton className='h-5 w-24 rounded-full' />
            <Skeleton className='h-8 w-3/4' />
            <Skeleton className='h-10 w-40' />
            <Skeleton className='h-24 w-full' />
          </div>
        </div>
        <div className='space-y-6'>
          <div className='space-y-4 rounded-lg border bg-card p-5'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-9 w-40' />
            <Skeleton className='h-px w-full' />
            <Skeleton className='h-6 w-full' />
            <Skeleton className='h-11 w-full' />
          </div>
          <div className='space-y-3 rounded-lg border bg-card p-5'>
            <Skeleton className='h-5 w-28' />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className='h-9 w-full' />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
