'use client';

import { signUp } from '@/actions/auth/Signup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUpSchema, type signUpSchemaT } from '@/types/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const FIELDS = [
  { name: 'userName', label: 'Username', type: 'text', autoComplete: 'username' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    autoComplete: 'new-password',
    hint: 'At least 8 characters.',
  },
  {
    name: 'confirmPassword',
    label: 'Confirm password',
    type: 'password',
    autoComplete: 'new-password',
  },
] as const;

const SignUp = () => {
  const router = useRouter();
  const form = useForm<signUpSchemaT>({ resolver: zodResolver(signUpSchema) });

  const { mutate: register, isPending } = useMutation({
    mutationFn: signUp,
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push('/');
      router.refresh();
    },
    onError: () => toast.error('Could not create your account. Try again.'),
  });

  return (
    <div className='flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12'>
      <div className='w-full max-w-sm rounded-lg border border-border bg-card p-7'>
        <p className='font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
          Registration
        </p>
        <h1 className='mt-1.5 font-display text-2xl font-semibold'>Create an account</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          You need one to bid or to list a lot.
        </p>

        <form
          className='mt-6 space-y-4'
          onSubmit={form.handleSubmit((values) => register(values))}
        >
          {FIELDS.map((field) => (
            <div key={field.name}>
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                {...form.register(field.name)}
              />
              {'hint' in field && !form.formState.errors[field.name] && (
                <p className='mt-1 text-xs text-muted-foreground'>{field.hint}</p>
              )}
              {form.formState.errors[field.name] && (
                <p className='mt-1 text-sm text-destructive' role='alert'>
                  {form.formState.errors[field.name]?.message}
                </p>
              )}
            </div>
          ))}

          <Button type='submit' className='w-full' disabled={isPending}>
            {isPending ? 'Creating…' : 'Create account'}
          </Button>
        </form>

        <p className='mt-5 text-center text-sm text-muted-foreground'>
          Already registered?{' '}
          <Link href='/sign-in' className='text-foreground underline underline-offset-2'>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
