'use client';

import { Loader2, Search as SearchIcon, XCircle } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRef, useTransition } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Input } from '@/components/ui/input';

const Search = ({ placeholder = 'Search lots' }: { placeholder?: string }) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isSearching, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const query = searchParams.get('query') ?? '';

  const handleSearch = useDebouncedCallback((value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value) params.set('query', value);
      else params.delete('query');
      params.delete('page');
      replace(`${pathname}?${params.toString()}`);
    });
  }, 300);

  return (
    <div className='relative w-full'>
      {isSearching ? (
        <Loader2 className='absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground' />
      ) : (
        <SearchIcon className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
      )}

      <Input
        ref={inputRef}
        type='search'
        aria-label={placeholder}
        className='pl-9 pr-9'
        placeholder={placeholder}
        defaultValue={query}
        onChange={(event) => handleSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') inputRef.current?.blur();
        }}
      />

      {query && (
        <button
          type='button'
          aria-label='Clear search'
          className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
          onClick={() => {
            if (inputRef.current) inputRef.current.value = '';
            handleSearch('');
          }}
        >
          <XCircle className='size-4' />
        </button>
      )}
    </div>
  );
};

export default Search;
