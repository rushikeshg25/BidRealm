'use client';
import Signin from '@/actions/auth/Signin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInSchema, signInSchemaT } from '@/types/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

const SignIn = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
  });

  const { mutateAsync: server_Signin, isPending } = useMutation({
    mutationFn: Signin,
    onSuccess: (result) => {
      // On success the action redirects, so nothing comes back -- only a
      // rejection produces a result to render. The previous version relied on
      // the thrown error's message, which meant the raw distinction between
      // "User not found with Entered email" and "Invalid password" was shown to
      // the user (and to anyone probing for registered addresses).
      if (result && !result.ok) toast.error(result.error);
    },
    onError: () => {
      toast.error('Could not sign you in. Please try again.');
    },
  });

  const onSubmit = async (Formdata: signInSchemaT) => {
    // `mutate` returns void, so the previous `await mutate(...)` inside a
    // try/catch could never catch anything and isSubmitting flipped back
    // immediately -- the disabled state and the catch block were both dead code.
    await server_Signin(Formdata);
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-muted dark:bg-background'>
      <div className='w-full max-w-md p-6 space-y-4 rounded-lg shadow-lg bg-background dark:border '>
        <div className='text-center'>
          <h1 className='text-3xl font-bold text-primary dark:text-foreground'>
            Sign In
          </h1>
        </div>
        <form className='space-y-2' onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor='email' className='text-muted-foreground'>
              Email
            </Label>
            <Input
              type='email'
              placeholder='Enter your email'
              className='w-full px-4 py-2 rounded-md bg-muted dark:bg-card dark:text-primary'
              {...register('email')}
            />
            <div className='min-h-[20px]'>
              {errors.email && (
                <p className='text-sm text-red-500'>{errors.email.message}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor='password' className='text-muted-foreground'>
              Password
            </Label>
            <Input
              type='password'
              placeholder='Enter your password'
              className='w-full px-4 py-2 rounded-md bg-muted dark:bg-card dark:text-primary'
              {...register('password')}
            />
            <div className='min-h-[20px]'>
              {errors.password && (
                <p className='text-sm text-red-500'>
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <Button
            type='submit'
            disabled={isPending}
            className='w-full px-4 py-2 font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-muted'
          >
            Sign In
          </Button>
        </form>
        <div className='text-center text-muted-foreground'>
          Create an account?{' '}
          <Link
            href='/sign-up'
            className='text-primary dark:text-foreground hover:underline'
            prefetch={false}
          >
            Signup
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
