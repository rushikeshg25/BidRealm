import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The account menu's trigger was a bare `<div>` holding an icon, with no
 * accessible name and no indication of who was signed in (the navbar received a
 * Session rather than a User, and getUserAttributes did not expose userName).
 *
 * Deliberately not @radix-ui/react-avatar: there are no remote avatar images in
 * this app -- only initials -- so the image-loading state machine that package
 * exists to manage has nothing to manage.
 */
const Avatar = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "relative flex h-9 w-9 shrink-0 select-none items-center justify-center",
      "overflow-hidden rounded-full bg-accent text-accent-foreground",
      "text-xs font-semibold uppercase tracking-wide",
      className
    )}
    {...props}
  />
));
Avatar.displayName = "Avatar";

/** Derives up to two initials from a username. */
export const initialsOf = (name: string | null | undefined): string => {
  if (!name) return "?";
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return `${parts[0]![0]}${parts[1]![0]}`;
};

const AvatarFallback = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn("leading-none", className)} {...props} />
));
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarFallback };
