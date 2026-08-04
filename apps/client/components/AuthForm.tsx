'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormRegister,
} from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GavelIcon from './icons/GavelIcon';
import { cn } from '@/lib/utils';

/**
 * The shared shell for sign-in and sign-up, which were about 95% identical markup.
 *
 * Both also had `min-h-screen` on a page that already sits below a sticky navbar
 * inside a `min-h-screen` layout, so the card was pushed down and the page always
 * scrolled by exactly the navbar's height.
 */
export const AuthCard = ({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) => (
  <div className='flex flex-1 items-center justify-center px-4 py-12'>
    <Card className='w-full max-w-md'>
      <CardHeader className='space-y-3 text-center'>
        <GavelIcon className='mx-auto h-8 w-8 text-primary' />
        <CardTitle className='text-2xl'>{title}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {children}
        <p className='text-center text-sm text-muted-foreground'>{footer}</p>
      </CardContent>
    </Card>
  </div>
);

/**
 * A labelled input. Every field on both auth pages had a `<Label htmlFor="email">`
 * against an `<Input>` with no matching id -- register() supplies only `name` -- so
 * not one label was associated with its control.
 */
export const AuthField = <T extends FieldValues>({
  id,
  label,
  type = 'text',
  placeholder,
  autoComplete,
  register,
  name,
  errors,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  register: UseFormRegister<T>;
  name: Path<T>;
  errors: FieldErrors<T>;
}) => {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  const message = errors[name]?.message as string | undefined;

  return (
    <div className='space-y-1.5'>
      <Label htmlFor={id}>{label}</Label>
      <div className='relative'>
        <Input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          placeholder={placeholder}
          // Absent before, so password managers had nothing to work with.
          autoComplete={autoComplete}
          aria-invalid={message ? true : undefined}
          className={cn(isPassword && 'pr-10')}
          {...register(name)}
        />
        {isPassword ? (
          <button
            type='button'
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className='absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground'
          >
            {revealed ? (
              <EyeOff className='h-4 w-4' />
            ) : (
              <Eye className='h-4 w-4' />
            )}
          </button>
        ) : null}
      </div>
      {/* Was hardcoded `text-red-500` rather than the destructive token. */}
      <div className='min-h-[20px]'>
        {message ? <p className='text-sm text-destructive'>{message}</p> : null}
      </div>
    </div>
  );
};

export const AuthSubmit = ({
  isPending,
  label,
  pendingLabel,
}: {
  isPending: boolean;
  label: string;
  pendingLabel: string;
}) => (
  // The old className included `hover:bg-primary-hover`, which is not a token in
  // tailwind.config -- so the primary submit button on both pages had no hover
  // state at all. Button's own variant handles this.
  <Button type='submit' className='w-full' disabled={isPending}>
    {isPending ? (
      <>
        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
        {pendingLabel}
      </>
    ) : (
      label
    )}
  </Button>
);

export const AuthLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <Link href={href} className='font-medium text-primary hover:underline'>
    {children}
  </Link>
);
