"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import type { IssueType, IssuePriority } from "@/types";

export interface BoardFiltersState {
  type: IssueType | "";
  priority: IssuePriority | "";
  assignee: string;
  search: string;
}

interface BoardFiltersProps {
  filters: BoardFiltersState;
  onFilterChange: (filters: BoardFiltersState) => void;
}

const ISSUE_TYPES: { value: IssueType | ""; label: string }[] = [
  { value: "", label: "All types" },
  { value: "bug", label: "Bug" },
  { value: "story", label: "Story" },
  { value: "task", label: "Task" },
  { value: "epic", label: "Epic" },
  { value: "subtask", label: "Subtask" },
];

const PRIORITIES: { value: IssuePriority | ""; label: string }[] = [
  { value: "", label: "All priorities" },
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "none", label: "None" },
];

export function BoardFilters({ filters, onFilterChange }: BoardFiltersProps) {
  const update = (partial: Partial<BoardFiltersState>) => {
    onFilterChange({ ...filters, ...partial });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[180px] max-w-[240px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search issues..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className={cn(
            "w-full pl-8 pr-3 py-1.5 text-sm border border-input rounded-[3px]",
            "bg-white text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring"
          )}
        />
      </div>
      <select
        value={filters.type}
        onChange={(e) => update({ type: e.target.value as IssueType | "" })}
        className={cn(
          "px-3 py-1.5 text-sm border border-input rounded-[3px]",
          "bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        )}
      >
        {ISSUE_TYPES.map((opt) => (
          <option key={opt.value || "all"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        value={filters.priority}
        onChange={(e) => update({ priority: e.target.value as IssuePriority | "" })}
        className={cn(
          "px-3 py-1.5 text-sm border border-input rounded-[3px]",
          "bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        )}
      >
        {PRIORITIES.map((opt) => (
          <option key={opt.value || "all"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Assignee"
        value={filters.assignee}
        onChange={(e) => update({ assignee: e.target.value })}
        className={cn(
          "px-3 py-1.5 text-sm border border-input rounded-[3px] w-32",
          "bg-white text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring"
        )}
      />
    </div>
  );
}
