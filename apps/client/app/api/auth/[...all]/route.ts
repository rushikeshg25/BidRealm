import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth-service';

export const { GET, POST } = toNextJsHandler(auth);
