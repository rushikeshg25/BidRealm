import { z } from 'zod';

export const signUpSchema = z
  .object({
    userName: z
      .string()
      .min(1, 'Username is required')
      .max(50, 'Username cannot exceed 50 characters'),
    email: z.string().min(1, 'Email is required').email('Invalid email format'),
    // Was a bare z.string() with no minimum, while signInSchema requires eight
    // characters -- so sign-up accepted passwords that sign-in would then reject.
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(50, 'Password cannot exceed 50 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const signInSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(50, 'Password cannot exceed 50 characters'),
});

export type signUpSchemaT = z.infer<typeof signUpSchema>;
export type signInSchemaT = z.infer<typeof signInSchema>;
