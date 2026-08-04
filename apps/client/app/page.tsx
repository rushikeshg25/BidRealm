import { getAuctions } from '@/actions/GetAuctions';
import Filters from '@/components/Filters';
import { PageShell } from '@/components/PageShell';
import Auctions from '@/components/pages/Auctions';
import PaginationWrapper from '@/components/PaginationWrapper';

export default async function Page({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
    limit?: string;
    min?: string;
    max?: string;
    s?: string[];
    categories?: string[];
  };
}) {
  const search = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 6;
  const offset = (currentPage - 1) * limit;
  const min = searchParams?.min || '';
  const max = searchParams?.max || '';
  const status = searchParams?.s || [];
  const categories = searchParams?.categories || [];
  const { auctions, totalCount, totalPages } = await getAuctions({
    offset,
    limit,
    search,
  });
  return (
    <PageShell width='wide'>
      <div className='grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]'>
        <Filters />
        <div className='flex flex-col gap-6'>
          <Auctions
            auctions={auctions}
            totalCount={totalCount}
            isFiltered={Boolean(search)}
          />
          <PaginationWrapper totalPages={totalPages} />
        </div>
      </div>
    </PageShell>
  );
}
