'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { Loader2, Menu, Plus } from 'lucide-react';
import type { User } from 'lucia';
import toast from 'react-hot-toast';

import Signout from '@/actions/auth/Signout';
import { cn } from '@/lib/utils';
import GavelIcon from './icons/GavelIcon';
import { ModeToggle } from './ThemeToggle';
import Search from './Search';
import { Avatar, AvatarFallback, initialsOf } from './ui/avatar';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
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
} from './ui/sheet';

const NAV_LINKS = [
  { href: '/my-auctions', label: 'My auctions' },
  { href: '/my-bids', label: 'My bids' },
] as const;

/**
 * Receives the `user` rather than the `session` it used to take: a Session
 * carries no username, so the account menu had nothing to identify the signed-in
 * user with. Also owns its own sticky/backdrop classes, which used to be handed
 * down from the layout as a className string.
 */
const Navbar = ({ user }: { user: User | null }) => {
  const pathname = usePathname();

  const { mutate: server_Signout, isPending: isSigningOut } = useMutation({
    mutationFn: Signout,
    // The action redirects and revalidates the layout itself, so there is
    // nothing to push. The missing onError meant a failed signout was completely
    // silent -- the user stayed logged in with no indication why.
    onError: () => {
      toast.error('Could not sign you out. Please try again.');
    },
  });

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-border/60',
        'bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60'
      )}
    >
      <div className='mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8'>
        <Link
          href='/'
          className='flex shrink-0 items-center gap-2 rounded-md'
          prefetch={false}
        >
          <GavelIcon className='h-6 w-6 text-primary' />
          <span className='hidden text-lg font-semibold tracking-tight sm:block'>
            BidRealm
          </span>
        </Link>

        {/*
          Search used to render only on '/', while /my-auctions shipped a second
          copy of its own inside the page body -- two different search affordances
          in two places, neither of them in the header. It lives here now.
        */}
        <div className='mx-auto hidden w-full max-w-md md:block'>
          <Search />
        </div>

        <div className='ml-auto hidden items-center gap-1 md:flex'>
          {user ? (
            <>
              {NAV_LINKS.map((link) => (
                <Button
                  key={link.href}
                  asChild
                  variant='ghost'
                  size='sm'
                  // There was no active-route indication anywhere in the nav.
                  className={cn(isActive(link.href) && 'bg-accent text-accent-foreground')}
                >
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                </Button>
              ))}

              {/*
                Was a raw <Link> carrying `bg-black text-white dark:bg-white
                dark:text-black` and a typo'd `hover:cursor:pointer` that made the
                primary CTA render without a pointer cursor. Button asChild gives
                it the amber primary treatment and real hover/focus states.
              */}
              <Button asChild size='sm' className='ml-1'>
                <Link href='/new'>
                  <Plus className='mr-1.5 h-4 w-4' />
                  New auction
                </Link>
              </Button>
            </>
          ) : null}

          <ModeToggle />

          {user ? (
            <DropdownMenu>
              {/*
                asChild was missing, so this rendered a <button> wrapping a
                <div> -- nested interactive content with no accessible name.
              */}
              <DropdownMenuTrigger asChild>
                <button
                  type='button'
                  aria-label={`Account menu for ${user.userName}`}
                  className='ml-1 rounded-full ring-offset-background transition-opacity hover:opacity-85'
                >
                  <Avatar>
                    <AvatarFallback>{initialsOf(user.userName)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-56'>
                <DropdownMenuLabel className='font-normal'>
                  <span className='block text-sm font-medium'>
                    {user.userName}
                  </span>
                  <span className='block truncate text-xs text-muted-foreground'>
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href='/my-auctions'>My auctions</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href='/my-bids'>My bids</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => server_Signout()}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Signing out…
                    </>
                  ) : (
                    'Sign out'
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant='ghost' size='sm'>
                <Link href='/sign-in'>Sign in</Link>
              </Button>
              <Button asChild size='sm'>
                <Link href='/sign-up'>Sign up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile */}
        <div className='ml-auto md:hidden'>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant='ghost' size='icon' aria-label='Open menu'>
                <Menu className='h-5 w-5' />
              </Button>
            </SheetTrigger>
            <SheetContent className='flex flex-col'>
              <SheetHeader>
                <SheetTitle className='flex items-center gap-2'>
                  <GavelIcon className='h-5 w-5 text-primary' />
                  BidRealm
                </SheetTitle>
              </SheetHeader>

              <div className='mt-4 md:hidden'>
                <Search />
              </div>

              {/*
                Every item used to be a Button calling router.push, wrapped in a
                single `SheetClose asChild` around a non-interactive <div> -- which
                made the entire panel body the close trigger. They are Links now,
                each its own SheetClose, so they prefetch, middle-click, and show
                an active state.
              */}
              <nav className='mt-6 flex flex-col gap-1'>
                {user ? (
                  <>
                    <SheetClose asChild>
                      <Link
                        href='/new'
                        className='flex items-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground'
                      >
                        <Plus className='h-4 w-4' />
                        New auction
                      </Link>
                    </SheetClose>

                    {NAV_LINKS.map((link) => (
                      <SheetClose asChild key={link.href}>
                        <Link
                          href={link.href}
                          aria-current={isActive(link.href) ? 'page' : undefined}
                          className={cn(
                            'rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                            isActive(link.href) && 'bg-accent text-accent-foreground'
                          )}
                        >
                          {link.label}
                        </Link>
                      </SheetClose>
                    ))}
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link
                        href='/sign-in'
                        className='rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent'
                      >
                        Sign in
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href='/sign-up'
                        className='rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground'
                      >
                        Sign up
                      </Link>
                    </SheetClose>
                  </>
                )}
              </nav>

              {/* mt-auto actually pins this to the bottom; the previous
                  `flex-grow` spacer sat inside a justify-center column and did
                  nothing. */}
              <div className='mt-auto space-y-4 pb-2'>
                {user ? (
                  <>
                    <Separator />
                    <div className='flex items-center gap-3 px-1'>
                      <Avatar>
                        <AvatarFallback>
                          {initialsOf(user.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm font-medium'>
                          {user.userName}
                        </p>
                        <p className='truncate text-xs text-muted-foreground'>
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant='outline'
                      className='w-full'
                      onClick={() => server_Signout()}
                      disabled={isSigningOut}
                    >
                      {isSigningOut ? (
                        <>
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          Signing out…
                        </>
                      ) : (
                        'Sign out'
                      )}
                    </Button>
                  </>
                ) : null}

                <Separator />
                <div className='flex items-center gap-2'>
                  <Button asChild variant='outline' className='flex-1'>
                    <Link
                      href='https://github.com/rushikeshg25/bid-turbo'
                      target='_blank'
                      rel='noreferrer'
                    >
                      <GitHubLogoIcon className='mr-2 h-4 w-4' />
                      GitHub
                    </Link>
                  </Button>
                  <ModeToggle />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
