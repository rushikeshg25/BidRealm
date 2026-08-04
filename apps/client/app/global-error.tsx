'use client';

import { useEffect } from 'react';

/**
 * The last-resort boundary: catches errors thrown in the root layout itself, which
 * app/error.tsx cannot. It has to render its own <html> and <body>, and cannot use
 * the theme provider or any app component, since the failure may be in that tree.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang='en'>
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          textAlign: 'center',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            The application failed to load
          </h1>
          <p style={{ marginTop: '0.5rem', color: '#71717a' }}>
            Please reload the page.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid #d4d4d8',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
