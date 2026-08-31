import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/components/theme-provider';
import { getAuth } from '@/lib/auth';
import ReactQueryClientProvider from '@/providers/ReactQueryClientProvider';
import '@uploadthing/react/styles.css';
import type { Metadata } from 'next';
import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// Prices and clocks only. Tabular figures keep a running countdown from
// shifting the layout every second.
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BidRealm',
  description: 'Live auctions, bid by bid.',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { session } = await getAuth();

  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <ReactQueryClientProvider>
          <ThemeProvider
            attribute='class'
            defaultTheme='system'
            enableSystem
            disableTransitionOnChange
          >
            <div className='flex min-h-screen flex-col bg-background text-foreground'>
              <Navbar session={session} />
              <Toaster
                position='top-center'
                toastOptions={{
                  className:
                    'border border-border bg-card text-card-foreground text-sm',
                }}
              />
              <main className='flex-1'>{children}</main>
            </div>
          </ThemeProvider>
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
