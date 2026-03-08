"use client";

import { Bug, BookOpen, CheckSquare, Zap, GitBranch, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { IIssue, IssueType, IUser } from "@/types";
import { IssuePriorityBadge } from "./IssuePriorityBadge";

const TYPE_ICONS: Record<IssueType, LucideIcon> = {
  bug: Bug,
  story: BookOpen,
  task: CheckSquare,
  epic: Zap,
  subtask: GitBranch,
};

interface IssueCardProps {
  issue: IIssue;
  onClick?: () => void;
  className?: string;
}

function AssigneeAvatar({
  assignee,
}: {
  assignee: string | { _id: string; name?: string; image?: string };
}) {
  if (typeof assignee === "string") return null;
  if (assignee.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={assignee.image}
        alt={assignee.name ?? ""}
        className="size-6 rounded-full object-cover border border-border"
        title={assignee.name}
      />
    );
  }
  const initials = (assignee.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <span
      className="size-6 rounded-full bg-primary/20 text-primary text-[10px] font-medium flex items-center justify-center border border-border"
      title={assignee.name}
    >
      {initials}
    </span>
  );
}

export function IssueCard({ issue, onClick, className }: IssueCardProps) {
  const TypeIcon = TYPE_ICONS[issue.type];
  const assignees = issue.assignees ?? [];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left bg-white border border-border rounded-[3px] p-3 hover:shadow-md transition-shadow cursor-pointer",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
          {issue.key}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground font-medium line-clamp-2">
            {issue.title}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <TypeIcon className="size-3.5 text-muted-foreground shrink-0" />
            <IssuePriorityBadge priority={issue.priority} />
            {assignees.length > 0 && (
              <div className="flex -space-x-1.5 ml-auto">
                {assignees
                  .filter((a): a is IUser => typeof a !== "string")
                  .slice(0, 3)
                  .map((a) => (
                    <AssigneeAvatar key={a._id} assignee={a} />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
