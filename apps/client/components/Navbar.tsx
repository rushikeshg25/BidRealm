'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import GavelIcon from './icons/GavelIcon';
import UserIcon from './icons/UserIcon';
import { ModeToggle } from './ThemeToggle';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Session } from 'lucia';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import Signout from '@/actions/auth/Signout';
import toast from 'react-hot-toast';
import Search from './Search';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';

const Navbar = ({
  className,
  session,
}: {
  className?: string;
  session: Session | null;
}) => {
  const pathname = usePathname();

  const router = useRouter();
  const { mutate: server_Signout } = useMutation({
    mutationFn: Signout,
    // The action redirects to /sign-in and revalidates the layout itself now, so
    // there is nothing to push. The missing onError meant a failed signout was
    // completely silent -- the user stayed logged in with no indication why.
    onError: () => {
      toast.error('Could not sign you out. Please try again.');
    },
  });
  const LoginHandler = () => {
    router.push('/sign-up');
  };
  const LogoutHandler = () => {
    server_Signout();
  };
  return (
    <header
      className={cn(' py-4 px-10 flex items-center justify-between', className)}
    >
      <Link href='/' className='flex items-center gap-2' prefetch={false}>
        <GavelIcon className='w-6 h-6' />
        <span className='text-xl font-bold hidden md:block'>BidRealm</span>
      </Link>
      {pathname === '/' && (
        <div className='flex-1 max-w-md mx-6'>
          <div className='relative'>
            <Search />
          </div>
        </div>
      )}

      <div className='hidden md:flex items-center gap-4'>
        {session !== null && (
          <Link
            href={'/new'}
            className='bg-black text-white px-4 py-2 rounded-lg hover:cursor:pointer dark:bg-white dark:text-black hidden md:block'
          >
            New Auction
          </Link>
        )}
        <ModeToggle />
        {!session ? (
          <Button onClick={() => router.push('/sign-up')}>Sign Up</Button>
        ) : (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className='flex items-center justify-center border border-[#98989a] rounded-full dark:border-white size-8'>
                  <UserIcon className='w-7 h-7 font-light dark:text-white' />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/my-auctions')}>
                  Manage my Auctions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/my-bids')}>
                  Bids
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={LogoutHandler}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
      {/*Mobile Menu*/}
      <div className='md:hidden'>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant='outline' className='w-full h-full '>
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>BidRealm</SheetTitle>
            </SheetHeader>

            <SheetClose asChild className='h-full pt-10'>
              <div className='flex flex-col items-center justify-center gap-y-2'>
                {session !== null && (
                  <Button variant={'ghost'} onClick={() => router.push('/new')}>
                    New Auction
                  </Button>
                )}
                {session !== null && (
                  <Button
                    variant={'ghost'}
                    onClick={() => router.push('/my-auctions')}
                  >
                    Manage my Auctions
                  </Button>
                )}

                {session !== null && (
                  <Button
                    variant={'ghost'}
                    onClick={() => router.push('/my-bids')}
                  >
                    Bids
                  </Button>
                )}

                {session !== null ? (
                  <Button variant={'ghost'} onClick={LogoutHandler}>
                    Logout
                  </Button>
                ) : (
                  <Button variant={'ghost'} onClick={LoginHandler}>
                    SignUp
                  </Button>
                )}
                <div className='flex-grow'></div>
                <div className='flex items-center gap-2 mb-9'>
                  <Link href={'https://github.com/rushikeshg25/bid-turbo'}>
                    <Button variant='outline'>
                      <GitHubLogoIcon className='w-5 h-5 mr-2' />
                      Github
                    </Button>
                  </Link>
                  <ModeToggle />
                </div>
              </div>
            </SheetClose>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Navbar;
