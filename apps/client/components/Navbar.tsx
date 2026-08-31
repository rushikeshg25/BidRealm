'use client';

import Signout from '@/actions/auth/Signout';
import { ModeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { useMutation } from '@tanstack/react-query';
import type { Session } from 'lucia';
import { Gavel, Menu, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const NAV = [
  { href: '/new', label: 'List a lot' },
  { href: '/my-auctions', label: 'My lots' },
  { href: '/my-bids', label: 'My bids' },
];

const Navbar = ({ session }: { session: Session | null }) => {
  const router = useRouter();

  const { mutate: signOut, isPending } = useMutation({
    mutationFn: Signout,
    onSuccess: () => {
      router.push('/');
      // The session lives in a server component, so without a refresh the
      // navbar would keep rendering as though you were still signed in.
      router.refresh();
    },
  });

  return (
    <header className='sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70'>
      <div className='mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 md:px-6'>
        <Link href='/' className='flex items-center gap-2'>
          <Gavel className='size-5 text-paddle' aria-hidden='true' />
          <span className='font-display text-lg font-semibold tracking-tight'>
            BidRealm
          </span>
        </Link>

        <nav className='hidden items-center gap-1 md:flex'>
          {session &&
            NAV.map((item) => (
              <Button key={item.href} asChild variant='ghost' size='sm'>
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}

          <ModeToggle />

          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='outline'
                  size='icon'
                  className='ml-1 rounded-full'
                  aria-label='Account'
                >
                  <UserIcon className='size-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {NAV.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={isPending} onSelect={() => signOut()}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className='ml-1 flex items-center gap-2'>
              <Button asChild variant='ghost' size='sm'>
                <Link href='/sign-in'>Sign in</Link>
              </Button>
              <Button asChild size='sm'>
                <Link href='/sign-up'>Create account</Link>
              </Button>
            </div>
          )}
        </nav>

        {/* Mobile */}
        <div className='md:hidden'>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant='outline' size='icon' aria-label='Open menu'>
                <Menu className='size-4' />
              </Button>
            </SheetTrigger>
            <SheetContent className='flex flex-col'>
              <SheetHeader>
                <SheetTitle className='font-display'>BidRealm</SheetTitle>
              </SheetHeader>

              {/* Each item closes the sheet. This used to wrap the entire panel
                  in one SheetClose, so every part of it was a close target. */}
              <nav className='mt-6 flex flex-col gap-1'>
                {session &&
                  NAV.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className='rounded-md px-3 py-2.5 text-sm hover:bg-accent'
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}

                {!session && (
                  <>
                    <SheetClose asChild>
                      <Link
                        href='/sign-in'
                        className='rounded-md px-3 py-2.5 text-sm hover:bg-accent'
                      >
                        Sign in
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href='/sign-up'
                        className='rounded-md px-3 py-2.5 text-sm hover:bg-accent'
                      >
                        Create account
                      </Link>
                    </SheetClose>
                  </>
                )}

                {session && (
                  <SheetClose asChild>
                    <button
                      type='button'
                      className='rounded-md px-3 py-2.5 text-left text-sm hover:bg-accent'
                      onClick={() => signOut()}
                    >
                      Sign out
                    </button>
                  </SheetClose>
                )}
              </nav>

              <div className='mt-auto flex items-center justify-between border-t border-border pt-4'>
                <Button asChild variant='ghost' size='sm'>
                  <Link href='https://github.com/rushikeshg25/BidRealm-turbo'>
                    <GitHubLogoIcon className='mr-2 size-4' />
                    GitHub
                  </Link>
                </Button>
                <ModeToggle />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
