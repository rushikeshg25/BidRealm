import Link from 'next/link';

export default function NotFound() {
  return (
    <div className='mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center'>
      <p className='font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground'>
        404
      </p>
      <h1 className='font-display text-2xl font-semibold'>
        There is nothing at this address
      </h1>
      <p className='text-sm text-muted-foreground'>
        The page you were after does not exist.
      </p>
      <Link
        href='/'
        className='mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground'
      >
        Back to the saleroom
      </Link>
    </div>
  );
}
