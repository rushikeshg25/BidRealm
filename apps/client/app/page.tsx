import { getAuctions } from '@/actions/GetAuctions';
import Filters from '@/components/Filters';
import { PageShell } from '@/components/PageShell';
import Auctions from '@/components/pages/Auctions';
import PaginationWrapper from '@/components/PaginationWrapper';
import SortSelect from '@/components/SortSelect';

/** Comma-separated in the URL (`?categories=Art,Vehicles`). */
const parseList = (value: string | string[] | undefined): string[] => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw.flatMap((entry) => entry.split(',')).filter(Boolean);
};

export default async function Page({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
    limit?: string;
    min?: string;
    max?: string;
    s?: string | string[];
    categories?: string | string[];
    sort?: string;
  };
}) {
  const search = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 12;
  const offset = (currentPage - 1) * limit;

  const min = searchParams?.min;
  const max = searchParams?.max;
  const status = parseList(searchParams?.s);
  const categories = parseList(searchParams?.categories);

  // min, max, s and categories were parsed into local variables here and then
  // never passed to getAuctions -- which is why the entire Filters sidebar was
  // decorative. Selecting a category changed the URL and nothing else.
  const { auctions, totalCount, totalPages } = await getAuctions({
    offset,
    limit,
    search,
    min,
    max,
    status,
    categories,
    sort: searchParams?.sort,
  });

  const isFiltered = Boolean(
    search || min || max || status.length > 0 || categories.length > 0
  );

  return (
    <PageShell width='wide'>
      <div className='grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]'>
        <Filters />
        <div className='flex flex-col gap-6'>
          <div className='flex items-center justify-end'>
            <SortSelect />
          </div>
          <Auctions
            auctions={auctions}
            totalCount={totalCount}
            isFiltered={isFiltered}
          />
          <PaginationWrapper totalPages={totalPages} />
        </div>
      </div>
    </PageShell>
  );
}
