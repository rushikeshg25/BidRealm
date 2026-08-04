import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A plain div with the right ARIA role, rather than @radix-ui/react-separator --
 * that package's entire job is applying `role="separator"` and an orientation
 * attribute, which is two lines here and one fewer dependency.
 */
const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical";
    /** Purely visual separators should be hidden from assistive technology. */
    decorative?: boolean;
  }
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = "Separator";

export { Separator };
