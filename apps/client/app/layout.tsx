import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { getAuth } from "@/lib/auth";
import ReactQueryClientProvider from "@/providers/ReactQueryClientProvider";
import "@uploadthing/react/styles.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  // Exposed as a CSS variable so tailwind.config's fontFamily.sans can reference
  // it. Previously only `inter.className` was dropped on <body>, which left
  // Tailwind's font-sans resolving to the default stack.
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "BidRealm — Live auctions",
    template: "%s · BidRealm",
  },
  description: "Bidding and auctions made easy. Bid live, win rare things.",
  openGraph: {
    title: "BidRealm — Live auctions",
    description: "Bidding and auctions made easy. Bid live, win rare things.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#121214" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await getAuth();

  return (
    <ReactQueryClientProvider>
      {/*
        suppressHydrationWarning is required: next-themes writes the theme class
        onto <html> before React hydrates, so the server and client markup differ
        by design. Without it every page load logged a hydration warning.
      */}
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {/* Keyboard and screen-reader users had no way past the nav. */}
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
            >
              Skip to content
            </a>

            {/*
              The wrapper no longer repeats `dark:bg-background
              dark:text-foreground` -- globals.css already applies both to <body>
              unconditionally. Navbar's sticky/backdrop classes moved into Navbar
              itself; they were passed down as a className string, which put the
              component's appearance in the layout's hands.
            */}
            <div className="flex min-h-screen flex-col">
              <Navbar user={user} />
              <main id="main" className="flex flex-1 flex-col">
                {children}
              </main>
            </div>

            {/*
              react-hot-toast renders unstyled by default, so toasts were
              light-on-light in dark mode and unreadable. Pointing it at the theme
              tokens fixes both themes at once. Moved out of the flex column too:
              it is an overlay and should not participate in layout flow.
            */}
            <Toaster
              position="top-center"
              toastOptions={{
                className:
                  "!bg-card !text-card-foreground !border !border-border !shadow-lg",
                success: { iconTheme: { primary: "hsl(var(--live))", secondary: "hsl(var(--live-foreground))" } },
                error: { iconTheme: { primary: "hsl(var(--destructive))", secondary: "hsl(var(--destructive-foreground))" } },
              }}
            />
          </ThemeProvider>
        </body>
      </html>
    </ReactQueryClientProvider>
  );
}
