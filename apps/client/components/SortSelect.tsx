'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Mirrors the ORDER_BY map in actions/GetAuctions.ts. */
const OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'ending-soon', label: 'Ending soon' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
] as const;

/** The listing had no sort control at all -- results were always createdAt desc. */
const SortSelect = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const current = searchParams.get('sort') ?? 'newest';

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'newest') params.delete('sort');
    else params.set('sort', value);
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger className='w-[180px]' aria-label='Sort auctions'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SortSelect;
