const Shimmer = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />
);

export default function Loading() {
  return (
    <div className='mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:py-10'>
      <Shimmer className='mb-6 h-10 w-56' />
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]'>
        <Shimmer className='h-96' />
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className='overflow-hidden rounded-lg border border-border'>
              <Shimmer className='aspect-[4/3] rounded-none' />
              <div className='space-y-3 p-4'>
                <Shimmer className='h-3 w-20' />
                <Shimmer className='h-5 w-3/4' />
                <Shimmer className='h-6 w-24' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
