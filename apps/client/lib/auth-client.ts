'use client';

import { createAuthClient } from 'better-auth/react';

// Same-origin HTTP requests run Better Auth's CSRF and rate-limit middleware.
export const authClient = createAuthClient();
