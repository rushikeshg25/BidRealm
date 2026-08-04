'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Loader2, SearchIcon, XIcon } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Search = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();

  const urlQuery = searchParams.get('query') ?? '';

  // The input is controlled now. It used to be uncontrolled with the clear button
  // gated on the *URL* param, so the ✕ only appeared once the debounced navigation
  // landed, and it lingered after clearing until the next navigation.
  const [value, setValue] = useState(urlQuery);

  // Keep in step when the URL changes from outside this component -- a filter chip
  // being removed, the back button, a fresh navigation.
  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  const commit = useDebouncedCallback((query: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) params.set('query', query);
      else params.delete('query');
      // Reset the page in *both* branches. Clearing the search used to leave
      // `page=5` in place, so it could drop you on an empty page.
      params.delete('page');
      replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, 300);

  const onChange = (next: string) => {
    setValue(next);
    commit(next);
  };

  return (
    // role=search and a real label: the input had neither.
    <div role='search' className='relative w-full'>
      <div className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'>
        {isSearching ? (
          <Loader2 className='h-4 w-4 animate-spin' />
        ) : (
          // Was `dark:text-white`, hardcoded rather than a token.
          <SearchIcon className='h-4 w-4' />
        )}
      </div>

      <label htmlFor='site-search' className='sr-only'>
        Search auctions
      </label>
      <Input
        id='site-search'
        type='search'
        // Was `p-5 pl-12`, which overrode the shadcn h-10 px-3 with padding-based
        // sizing and made this the only differently-sized input in the app.
        className='pl-9 pr-9 [&::-webkit-search-cancel-button]:appearance-none'
        placeholder='Search auctions…'
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onChange('');
        }}
      />

      {value ? (
        <Button
          type='button'
          onClick={() => onChange('')}
          variant='ghost'
          size='icon'
          aria-label='Clear search'
          // The old `dark:bg-black` on a ghost button painted a visible black
          // square over the input in dark mode.
          className='absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:bg-transparent hover:text-foreground'
        >
          <XIcon className='h-4 w-4' />
        </Button>
      ) : null}
    </div>
  );
};

export default Search;
