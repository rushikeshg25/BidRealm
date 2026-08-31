'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pageWindow } from '@/lib/pagination';

const PaginationWrapper = ({ totalPages }: { totalPages: number }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = Math.min(
    Math.max(Number(searchParams.get('page')) || 1, 1),
    Math.max(totalPages, 1)
  );

  if (totalPages <= 1) return null;

  const hrefFor = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    return `${pathname}?${params.toString()}`;
  };

  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;

  const base =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-border px-3 font-mono text-sm tabular transition-colors';
  const muted = 'pointer-events-none opacity-40';

  return (
    <nav aria-label='Pagination' className='flex items-center justify-center gap-1.5'>
      {/* Every one of these conditions used to test `currentPage - 1 === 0`,
          copy-pasted from the Previous link, so on page 1 the numbers and Next
          were all disabled too. */}
      <Link
        href={hrefFor(currentPage - 1)}
        aria-label='Previous page'
        aria-disabled={isFirst}
        tabIndex={isFirst ? -1 : undefined}
        className={cn(base, 'hover:bg-accent', isFirst && muted)}
      >
        <ChevronLeft className='size-4' />
      </Link>

      {pageWindow(currentPage, totalPages).map((item, index) =>
        item === 'ellipsis' ? (
          <span
            key={`gap-${index}`}
            aria-hidden='true'
            className='px-1 text-sm text-muted-foreground'
          >
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-current={item === currentPage ? 'page' : undefined}
            className={cn(
              base,
              item === currentPage
                ? 'border-foreground bg-foreground text-background'
                : 'hover:bg-accent'
            )}
          >
            {item}
          </Link>
        )
      )}

      <Link
        href={hrefFor(currentPage + 1)}
        aria-label='Next page'
        aria-disabled={isLast}
        tabIndex={isLast ? -1 : undefined}
        className={cn(base, 'hover:bg-accent', isLast && muted)}
      >
        <ChevronRight className='size-4' />
      </Link>
    </nav>
  );
};

export default PaginationWrapper;
