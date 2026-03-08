"use client";

import {
  Bug,
  BookOpen,
  CheckSquare,
  Zap,
  GitBranch,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { IssueType } from "@/types";

const TYPE_CONFIG: Record<
  IssueType,
  { icon: LucideIcon; color: string }
> = {
  bug: { icon: Bug, color: "text-destructive" },
  story: { icon: BookOpen, color: "text-[#00875a]" },
  task: { icon: CheckSquare, color: "text-info" },
  epic: { icon: Zap, color: "text-[#6554c0]" },
  subtask: { icon: GitBranch, color: "text-muted-foreground" },
};

interface IssueTypeBadgeProps {
  type: IssueType;
  className?: string;
}

export function IssueTypeBadge({ type, className }: IssueTypeBadgeProps) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.task;
  const { icon: Icon, color } = config;
  const label = (type ?? "task").charAt(0).toUpperCase() + (type ?? "task").slice(1);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      <Icon className={cn("size-3.5 shrink-0", color)} aria-hidden />
      {label}
    </span>
  );
}
