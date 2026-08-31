import { getAuctions } from '@/actions/GetAuctions';
import Filters from '@/components/Filters';
import PaginationWrapper from '@/components/PaginationWrapper';
import Search from '@/components/Search';
import Auctions from '@/components/pages/Auctions';
import { isCategory } from '@/types/categories';
import prisma from '@repo/db';
import { AuctionStatus, type AuctionStatusT, type CategoryT } from '@repo/db/types';

const PAGE_SIZE = 12;

const list = (value?: string) => value?.split(',').filter(Boolean) ?? [];

const toNumber = (value?: string) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : undefined;
};

export default async function Page({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
    min?: string;
    max?: string;
    s?: string;
    categories?: string;
  };
}) {
  const search = searchParams?.query || undefined;
  const currentPage = Math.max(Number(searchParams?.page) || 1, 1);

  // These were all parsed and then dropped: getAuctions only ever received
  // offset, limit and search, so every filter in the sidebar was decorative.
  const statuses = list(searchParams?.s).filter(
    (value): value is AuctionStatusT => value in AuctionStatus
  );
  const categories = list(searchParams?.categories).filter(
    (value): value is CategoryT => isCategory(value)
  );
  const min = toNumber(searchParams?.min);
  const max = toNumber(searchParams?.max);

  const [{ auctions, totalCount, totalPages }, liveCount] = await Promise.all([
    getAuctions({
      offset: (currentPage - 1) * PAGE_SIZE,
      limit: PAGE_SIZE,
      search,
      statuses,
      categories,
      min,
      max,
    }),
    prisma.auction.count({
      where: { status: AuctionStatus.ACTIVE, endDate: { gt: new Date() } },
    }),
  ]);

  const filtered = Boolean(
    search || statuses.length || categories.length || min !== undefined || max !== undefined
  );

  return (
    <div className='mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:py-10'>
      <header className='mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
        <div>
          <p className='flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
            <span className='size-1.5 rounded-full bg-live' aria-hidden='true' />
            <span className='tabular'>
              {liveCount === 1 ? '1 lot live now' : `${liveCount} lots live now`}
            </span>
          </p>
          <h1 className='mt-1.5 font-display text-3xl font-semibold md:text-4xl'>
            The saleroom
          </h1>
        </div>

        <div className='w-full md:max-w-sm'>
          <Search />
        </div>
      </header>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]'>
        <Filters />

        <div className='flex flex-col gap-6'>
          <p className='font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground tabular'>
            {totalCount === 1 ? '1 lot' : `${totalCount} lots`}
            {filtered && ' matching'}
          </p>

          <Auctions auctions={auctions} filtered={filtered} />
          <PaginationWrapper totalPages={totalPages} />
        </div>
      </div>
    </div>
  );
}
