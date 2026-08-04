'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Signin from '@/actions/auth/Signin';
import {
  AuthCard,
  AuthField,
  AuthLink,
  AuthSubmit,
} from '@/components/AuthForm';
import { signInSchema, signInSchemaT } from '@/types/auth';

const SignIn = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<signInSchemaT>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const { mutateAsync: server_Signin, isPending } = useMutation({
    mutationFn: Signin,
    onSuccess: (result) => {
      // On success the action redirects, so nothing comes back -- only a rejection
      // produces a result to render. This used to surface the thrown error's
      // message, which meant the raw distinction between "User not found with
      // Entered email" and "Invalid password" was shown to the user, and to anyone
      // probing for registered addresses.
      if (result && !result.ok) toast.error(result.error);
    },
    onError: () => {
      toast.error('Could not sign you in. Please try again.');
    },
  });

  const onSubmit = async (formData: signInSchemaT) => {
    // `mutate` returns void, so the previous `await mutate(...)` inside a try/catch
    // could never catch anything and isSubmitting flipped back immediately -- the
    // disabled state and the catch block were both dead code.
    await server_Signin(formData);
  };

  return (
    <AuthCard
      title='Sign in'
      footer={
        <>
          Don&apos;t have an account? <AuthLink href='/sign-up'>Sign up</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-2'>
        <AuthField
          id='signin-email'
          name='email'
          label='Email'
          type='email'
          placeholder='you@example.com'
          autoComplete='email'
          register={register}
          errors={errors}
        />
        <AuthField
          id='signin-password'
          name='password'
          label='Password'
          type='password'
          placeholder='Your password'
          autoComplete='current-password'
          register={register}
          errors={errors}
        />
        <AuthSubmit
          isPending={isPending}
          label='Sign in'
          pendingLabel='Signing in…'
        />
      </form>
    </AuthCard>
  );
};

export default SignIn;
