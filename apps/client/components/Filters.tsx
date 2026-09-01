'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { LOT_STATE } from '@/lib/lot';
import { CATEGORIES } from '@/types/categories';
import { AuctionStatus } from '@repo/db/types';

/** The sidebar speaks the language on the cards, not the database's. */
const STATUSES = [
  { value: AuctionStatus.ACTIVE, label: 'Live', dot: LOT_STATE.live.dot },
  { value: AuctionStatus.INACTIVE, label: 'Upcoming', dot: LOT_STATE.upcoming.dot },
  { value: AuctionStatus.ENDED, label: 'Sold', dot: LOT_STATE.ended.dot },
];

const Filters = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  /**
   * The URL is the single source of truth. This used to mirror everything into
   * local state and run applyFilters from a mount effect, so every page load
   * fired a router.replace before the visitor had touched anything.
   */
  const selected = (key: string): string[] =>
    searchParams.get(key)?.split(',').filter(Boolean) ?? [];

  const statuses = selected('s');
  const categories = selected('categories');

  const push = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams);
    mutate(params);
    // Any filter change invalidates the current page number.
    params.delete('page');
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  };

  const toggle = (key: string, value: string) => {
    const current = selected(key);
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

    push((params) =>
      next.length ? params.set(key, next.join(',')) : params.delete(key)
    );
  };

  const [min, setMin] = useState(searchParams.get('min') ?? '');
  const [max, setMax] = useState(searchParams.get('max') ?? '');

  useEffect(() => {
    setMin(searchParams.get('min') ?? '');
    setMax(searchParams.get('max') ?? '');
  }, [searchParams]);

  const pushPrice = useDebouncedCallback((key: 'min' | 'max', value: string) => {
    push((params) => (value ? params.set(key, value) : params.delete(key)));
  }, 400);

  const hasFilters =
    statuses.length > 0 ||
    categories.length > 0 ||
    searchParams.has('min') ||
    searchParams.has('max');

  return (
    <aside className='h-fit rounded-lg border border-border bg-card p-5'>
      <div className='flex items-center justify-between'>
        <h2 className='font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
          Filters
        </h2>
        {hasFilters && (
          <button
            type='button'
            className='text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground'
            onClick={() =>
              push((params) => {
                for (const key of ['s', 'categories', 'min', 'max']) params.delete(key);
              })
            }
          >
            Clear
          </button>
        )}
      </div>

      <fieldset className='mt-5'>
        <legend className='mb-2.5 text-xs font-medium'>Status</legend>
        <div className='space-y-2'>
          {STATUSES.map((status) => (
            <Label
              key={status.value}
              className='flex cursor-pointer items-center gap-2.5 text-sm font-normal'
            >
              <Checkbox
                checked={statuses.includes(status.value)}
                onCheckedChange={() => toggle('s', status.value)}
              />
              <span className={cn('size-1.5 rounded-full', status.dot)} aria-hidden='true' />
              {status.label}
            </Label>
          ))}
        </div>
      </fieldset>

      <fieldset className='mt-6'>
        <legend className='mb-2.5 text-xs font-medium'>Category</legend>
        <div className='space-y-2'>
          {CATEGORIES.map((category) => (
            <Label
              key={category.value}
              className='flex cursor-pointer items-center gap-2.5 text-sm font-normal'
            >
              <Checkbox
                checked={categories.includes(category.value)}
                onCheckedChange={() => toggle('categories', category.value)}
              />
              {category.label}
            </Label>
          ))}
        </div>
      </fieldset>

      <fieldset className='mt-6'>
        <legend className='mb-2.5 text-xs font-medium'>Price</legend>
        <div className='flex items-center gap-2'>
          <Input
            aria-label='Minimum price'
            inputMode='numeric'
            placeholder='Min'
            className='font-mono tabular'
            value={min}
            onChange={(event) => {
              setMin(event.target.value);
              pushPrice('min', event.target.value);
            }}
          />
          <span className='text-muted-foreground' aria-hidden='true'>
            -
          </span>
          <Input
            aria-label='Maximum price'
            inputMode='numeric'
            placeholder='Max'
            className='font-mono tabular'
            value={max}
            onChange={(event) => {
              setMax(event.target.value);
              pushPrice('max', event.target.value);
            }}
          />
        </div>
      </fieldset>
    </aside>
  );
};

export default Filters;
