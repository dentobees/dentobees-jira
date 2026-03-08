"use client";

import { cn } from "@/lib/cn";
import type { IssuePriority } from "@/types";

const PRIORITY_COLORS: Record<IssuePriority, string> = {
  urgent: "#de350b",
  high: "#ff5630",
  medium: "#ff991f",
  low: "#0065ff",
  none: "#6b778c",
};

interface IssuePriorityBadgeProps {
  priority: IssuePriority;
  className?: string;
}

export function IssuePriorityBadge({ priority, className }: IssuePriorityBadgeProps) {
  const color = PRIORITY_COLORS[priority];
  const label = priority.charAt(0).toUpperCase() + priority.slice(1);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}
