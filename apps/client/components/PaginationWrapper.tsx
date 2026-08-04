'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

type PaginationProps = {
  totalPages: number;
};

/**
 * The page numbers to render: first, last, and a window around the current page,
 * with ellipses standing in for the gaps.
 *
 * `Array.from({ length: totalPages })` rendered *every* page, so 200 auctions at
 * 6 per page produced 34 buttons in a row -- and shadcn's PaginationEllipsis
 * shipped in the repo entirely unused.
 */
const pageWindow = (current: number, total: number): (number | 'gap')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | 'gap')[] = [];

  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) result.push('gap');
    result.push(page);
  });

  return result;
};

const PaginationWrapper = ({ totalPages }: PaginationProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requested = Number(searchParams.get('page')) || 1;
  // Clamp: a hand-edited ?page=99 previously highlighted nothing and rendered an
  // empty grid with no way back.
  const currentPage = Math.min(Math.max(1, requested), Math.max(1, totalPages));

  // A single-page result rendered an orphan "1" control on every empty or short
  // result set.
  if (totalPages <= 1) return null;

  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={createPageURL(Math.max(1, currentPage - 1))}
            aria-disabled={isFirst}
            className={isFirst ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>

        {pageWindow(currentPage, totalPages).map((page, index) =>
          page === 'gap' ? (
            <PaginationItem key={`gap-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              {/*
                The disabled condition `currentPage - 1 === 0` was copy-pasted
                onto the numbered links *and* onto Next as well as Previous. On
                page 1 -- the page every visitor lands on -- that made every number
                and the Next button pointer-events-none, so there was no way
                forward at all. Links are never disabled; the current one is
                marked isActive, which was also never passed, so there had been no
                current-page highlight either.
              */}
              <PaginationLink
                href={createPageURL(page)}
                isActive={page === currentPage}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            href={createPageURL(Math.min(totalPages, currentPage + 1))}
            aria-disabled={isLast}
            className={isLast ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default PaginationWrapper;
