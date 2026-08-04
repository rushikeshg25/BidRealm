import { cn } from '@/lib/utils';

/**
 * One page container.
 *
 * Page width and padding were reinvented on every route: `p-5` on the home page,
 * `container px-4 py-8 sm:px-6 lg:px-8` on both dashboards, `max-w-6xl p-4
 * md:p-8` on the auction page, `max-w-4xl px-4 py-5 mt-10 mb-10` on the create
 * form, and `min-h-screen` on the auth pages -- three of which nested a second
 * `min-h-screen` inside the layout's own, and two of which added a second sticky
 * header underneath the navbar's.
 */
const WIDTHS = {
  // Listing grids and dashboards.
  wide: 'max-w-7xl',
  // Detail pages.
  default: 'max-w-6xl',
  // Forms.
  narrow: 'max-w-3xl',
} as const;

export const PageShell = ({
  children,
  width = 'default',
  className,
}: {
  children: React.ReactNode;
  width?: keyof typeof WIDTHS;
  className?: string;
}) => (
  <div
    className={cn(
      'mx-auto w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8',
      WIDTHS[width],
      className
    )}
  >
    {children}
  </div>
);

/** Page title plus optional description and trailing actions. */
export const PageHeader = ({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between',
      className
    )}
  >
    <div className='space-y-1'>
      <h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>
        {title}
      </h1>
      {description ? (
        <p className='text-sm text-muted-foreground'>{description}</p>
      ) : null}
    </div>
    {actions ? <div className='flex items-center gap-2'>{actions}</div> : null}
  </div>
);
