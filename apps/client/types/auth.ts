import { z } from 'zod';

// Sign-up used to accept a bare z.string() password while sign-in required
// 8-50, so it was possible to register a password you could never sign in with.
const password = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(50, 'Keep it under 50 characters');

export const signUpSchema = z
  .object({
    userName: z
      .string()
      .trim()
      .min(1, 'Pick a username')
      .max(50, 'Keep it under 50 characters'),
    email: z.string().trim().min(1, 'Enter your email').email('That is not a valid email'),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const signInSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('That is not a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export type signUpSchemaT = z.infer<typeof signUpSchema>;
export type signInSchemaT = z.infer<typeof signInSchema>;
