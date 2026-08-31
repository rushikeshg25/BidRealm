'use client';

import Signin from '@/actions/auth/Signin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInSchema, type signInSchemaT } from '@/types/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const SignIn = () => {
  const router = useRouter();
  const form = useForm<signInSchemaT>({ resolver: zodResolver(signInSchema) });

  // isPending, not the form's isSubmitting: with a mutation the form finishes
  // submitting immediately, so the button never actually disabled.
  const { mutate: signIn, isPending } = useMutation({
    mutationFn: Signin,
    onSuccess: (result) => {
      if (!result.ok) {
        form.setError('password', { message: result.error });
        return;
      }
      router.push('/');
      router.refresh();
    },
    onError: () => toast.error('Could not sign you in. Try again.'),
  });

  return (
    <div className='flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12'>
      <div className='w-full max-w-sm rounded-lg border border-border bg-card p-7'>
        <p className='font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
          Registration
        </p>
        <h1 className='mt-1.5 font-display text-2xl font-semibold'>Sign in</h1>

        <form
          className='mt-6 space-y-4'
          onSubmit={form.handleSubmit((values) => signIn(values))}
        >
          <div>
            <Label htmlFor='email'>Email</Label>
            <Input id='email' type='email' autoComplete='email' {...form.register('email')} />
            {form.formState.errors.email && (
              <p className='mt-1 text-sm text-destructive' role='alert'>
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor='password'>Password</Label>
            <Input
              id='password'
              type='password'
              autoComplete='current-password'
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <p className='mt-1 text-sm text-destructive' role='alert'>
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <Button type='submit' className='w-full' disabled={isPending}>
            {isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className='mt-5 text-center text-sm text-muted-foreground'>
          No account yet?{' '}
          <Link href='/sign-up' className='text-foreground underline underline-offset-2'>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
