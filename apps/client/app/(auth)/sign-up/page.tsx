'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { signUp } from '@/actions/auth/Signup';
import {
  AuthCard,
  AuthField,
  AuthLink,
  AuthSubmit,
} from '@/components/AuthForm';
import { signUpSchema, signUpSchemaT } from '@/types/auth';

const SignUp = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<signUpSchemaT>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      userName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const { mutateAsync: server_Signup, isPending } = useMutation({
    mutationFn: signUp,
    onSuccess: (result) => {
      // On success the action redirects, so only a rejection returns anything -- and
      // it now names the offending field ("That username is taken") rather than
      // surfacing a raw thrown Error's message.
      if (result && !result.ok) toast.error(result.error);
    },
    onError: () => {
      toast.error('Could not create your account. Please try again.');
    },
  });

  const onSubmit = async (formData: signUpSchemaT) => {
    await server_Signup(formData);
  };

  return (
    <AuthCard
      title='Create your account'
      footer={
        <>
          Already have an account? <AuthLink href='/sign-in'>Sign in</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-2'>
        {/* The original had a stray `<div className='static'>` wrapper here. */}
        <AuthField
          id='signup-username'
          name='userName'
          label='Username'
          placeholder='Pick a username'
          autoComplete='username'
          register={register}
          errors={errors}
        />
        <AuthField
          id='signup-email'
          name='email'
          label='Email'
          type='email'
          placeholder='you@example.com'
          autoComplete='email'
          register={register}
          errors={errors}
        />
        <AuthField
          id='signup-password'
          name='password'
          label='Password'
          type='password'
          placeholder='At least 8 characters'
          autoComplete='new-password'
          register={register}
          errors={errors}
        />
        <AuthField
          id='signup-confirm-password'
          name='confirmPassword'
          label='Confirm password'
          type='password'
          placeholder='Re-enter your password'
          autoComplete='new-password'
          register={register}
          errors={errors}
        />
        <AuthSubmit
          isPending={isPending}
          label='Create account'
          pendingLabel='Creating account…'
        />
      </form>
    </AuthCard>
  );
};

export default SignUp;
