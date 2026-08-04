'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { CATEGORIES } from '@/types/categories';
import { AuctionStatus } from '@repo/db/types';
import { PHASE_LABELS } from '@/lib/auction';

/**
 * Status values are the enum members the database actually stores. The previous
 * list was `["Active", "Ended", "Inactive"]` in title case, which could not have
 * matched a row even once the parameters were wired up.
 */
const STATUS_OPTIONS = [
  { value: AuctionStatus.ACTIVE, label: PHASE_LABELS.live },
  { value: AuctionStatus.INACTIVE, label: PHASE_LABELS.upcoming },
  { value: AuctionStatus.ENDED, label: PHASE_LABELS.ended },
] as const;

const readList = (params: URLSearchParams, key: string): string[] => {
  const raw = params.get(key);
  return raw ? raw.split(',').filter(Boolean) : [];
};

const FilterFields = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const status = readList(searchParams, 's');
  const categories = readList(searchParams, 'categories');

  // Only the price inputs hold local state, because they need to stay responsive
  // while the navigation is debounced. Everything else reads straight from the
  // URL, which removes the two effects that used to fight each other: one applied
  // filters on mount, the other hydrated state from the URL on mount, and each
  // retriggered the other.
  const [minPrice, setMinPrice] = useState(() => searchParams.get('min') ?? '');
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get('max') ?? '');

  useEffect(() => {
    setMinPrice(searchParams.get('min') ?? '');
    setMaxPrice(searchParams.get('max') ?? '');
  }, [searchParams]);

  /**
   * Builds the URL from the *current* params inside the handler.
   *
   * The old code created `new URLSearchParams(searchParams)` once at render top
   * level and then mutated that object from inside callbacks -- a stale closure, so
   * a handler created on one render wrote against a snapshot from that render.
   */
  const commit = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      // Any filter change invalidates the current page number; without this you
      // could apply a narrow filter and land on an empty page 4.
      params.delete('page');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const toggleInList = (key: string, value: string) => {
    commit((params) => {
      const current = readList(params, key);
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      if (next.length > 0) params.set(key, next.join(','));
      else params.delete(key);
    });
  };

  // Each keystroke used to fire a router.replace and a full server round trip.
  const commitPrice = useDebouncedCallback((key: 'min' | 'max', value: string) => {
    commit((params) => {
      if (value === '') params.delete(key);
      else params.set(key, value);
    });
  }, 400);

  const onPriceChange = (key: 'min' | 'max', raw: string) => {
    // Kept as a string rather than passed through Number(): `Number("abc")` is
    // NaN, and the old `value={minPrice || ""}` meant typing a literal 0 cleared
    // the field, because 0 is falsy.
    const digitsOnly = raw.replace(/[^\d]/g, '');
    if (key === 'min') setMinPrice(digitsOnly);
    else setMaxPrice(digitsOnly);
    commitPrice(key, digitsOnly);
  };

  return (
    // One Accordion with type="multiple", not three independent single-item
    // accordions (whose values were item-1, item-2 and item-4 -- item-3 had been
    // removed at some point).
    <Accordion
      type='multiple'
      defaultValue={['categories', 'price', 'status']}
      className='w-full'
    >
      <AccordionItem value='categories'>
        <AccordionTrigger className='text-sm'>Category</AccordionTrigger>
        <AccordionContent>
          <div className='grid gap-2.5 pt-1'>
            {/* Was a hardcoded seven-item array inline, one of three divergent
                category lists in the codebase. */}
            {CATEGORIES.map((category) => {
              const id = `category-${category.replace(/\s+/g, '-').toLowerCase()}`;
              return (
                <div key={category} className='flex items-center gap-2.5'>
                  <Checkbox
                    id={id}
                    checked={categories.includes(category)}
                    onCheckedChange={() => toggleInList('categories', category)}
                  />
                  {/* htmlFor/id: the checkboxes had no label association at all. */}
                  <label
                    htmlFor={id}
                    className='cursor-pointer text-sm leading-none'
                  >
                    {category}
                  </label>
                </div>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value='price'>
        <AccordionTrigger className='text-sm'>Price</AccordionTrigger>
        <AccordionContent>
          <div className='flex items-center gap-2 pt-1'>
            <Input
              aria-label='Minimum price'
              inputMode='numeric'
              placeholder='Min'
              value={minPrice}
              onChange={(event) => onPriceChange('min', event.target.value)}
              className='tabular'
            />
            <span className='text-muted-foreground'>–</span>
            <Input
              aria-label='Maximum price'
              inputMode='numeric'
              placeholder='Max'
              value={maxPrice}
              onChange={(event) => onPriceChange('max', event.target.value)}
              className='tabular'
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value='status' className='border-b-0'>
        <AccordionTrigger className='text-sm'>Status</AccordionTrigger>
        <AccordionContent>
          <div className='grid gap-2.5 pt-1'>
            {STATUS_OPTIONS.map((option) => {
              const id = `status-${option.value.toLowerCase()}`;
              return (
                <div key={option.value} className='flex items-center gap-2.5'>
                  <Checkbox
                    id={id}
                    checked={status.includes(option.value)}
                    onCheckedChange={() => toggleInList('s', option.value)}
                  />
                  {/* The old <label> carried peer-disabled: classes with no
                      `peer` sibling anywhere -- dead styling, and no htmlFor. */}
                  <label
                    htmlFor={id}
                    className='cursor-pointer text-sm leading-none'
                  >
                    {option.label}
                  </label>
                </div>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

/** The chips summarising what is currently applied, with per-filter removal. */
const ActiveFilterChips = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const chips: { key: string; value?: string; label: string }[] = [
    ...readList(searchParams, 'categories').map((value) => ({
      key: 'categories',
      value,
      label: value,
    })),
    ...readList(searchParams, 's').map((value) => ({
      key: 's',
      value,
      label:
        STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value,
    })),
  ];

  const min = searchParams.get('min');
  const max = searchParams.get('max');
  if (min || max) {
    chips.push({
      key: 'price',
      label: min && max ? `₹${min} – ₹${max}` : min ? `From ₹${min}` : `Up to ₹${max}`,
    });
  }

  if (chips.length === 0) return null;

  const remove = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (key === 'price') {
      params.delete('min');
      params.delete('max');
    } else if (value) {
      const next = readList(params, key).filter((item) => item !== value);
      if (next.length > 0) params.set(key, next.join(','));
      else params.delete(key);
    }

    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ['s', 'min', 'max', 'categories', 'page']) {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {chips.map((chip) => (
        <Badge
          key={`${chip.key}-${chip.value ?? 'range'}`}
          variant='secondary'
          className='gap-1 pr-1 font-normal'
        >
          {chip.label}
          <button
            type='button'
            onClick={() => remove(chip.key, chip.value)}
            aria-label={`Remove ${chip.label} filter`}
            className='rounded-full p-0.5 hover:bg-background/60'
          >
            <X className='h-3 w-3' />
          </button>
        </Badge>
      ))}
      {/* Was a raw <button> with no focus ring and no styling. */}
      <Button variant='ghost' size='sm' onClick={clearAll} className='h-7 px-2'>
        Clear all
      </Button>
    </div>
  );
};

const Filters = () => {
  const searchParams = useSearchParams();
  const activeCount =
    readList(searchParams, 'categories').length +
    readList(searchParams, 's').length +
    (searchParams.get('min') || searchParams.get('max') ? 1 : 0);

  return (
    <>
      {/*
        Mobile. The panel used to stack above the grid at every width below md,
        pushing every listing below the fold. It is a sheet now, with the active
        filter count on the trigger.
      */}
      <div className='md:hidden'>
        <div className='flex items-center gap-2'>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant='outline' size='sm' className='gap-2'>
                <SlidersHorizontal className='h-4 w-4' />
                Filters
                {activeCount > 0 ? (
                  <Badge className='h-5 min-w-5 justify-center px-1'>
                    {activeCount}
                  </Badge>
                ) : null}
              </Button>
            </SheetTrigger>
            <SheetContent side='left' className='overflow-y-auto'>
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className='mt-4'>
                <FilterFields />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className='mt-3'>
          <ActiveFilterChips />
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className='hidden md:block'>
        <div className='sticky top-24 space-y-4 rounded-lg border bg-card p-4'>
          <h2 className='text-sm font-semibold'>
            Filters
            {activeCount > 0 ? (
              <span className='ml-2 font-normal text-muted-foreground'>
                ({activeCount})
              </span>
            ) : null}
          </h2>
          <ActiveFilterChips />
          <FilterFields />
        </div>
      </aside>
    </>
  );
};

export default Filters;
