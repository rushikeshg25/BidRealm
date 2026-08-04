import { cn } from "@/lib/utils";

/**
 * A shimmering placeholder. The app had no skeleton component at all, so every
 * loading state was either a blank screen or the literal string "Loading...",
 * which then reflowed the layout when the real content arrived.
 *
 * The shimmer is a translating gradient rather than a pulsing opacity, so a grid
 * of skeletons reads as one loading surface instead of many blinking boxes.
 */
const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-md bg-muted",
      // The shimmer overlay.
      "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
      "after:bg-gradient-to-r after:from-transparent after:via-foreground/[0.06] after:to-transparent",
      "motion-safe-only",
      className
    )}
    aria-hidden="true"
    {...props}
  />
);

export { Skeleton };
