"use client";

import { useRef, useState, useEffect } from "react";
import { Search, ChevronDown, Check, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import type { IssueType, IssuePriority } from "@/types";

export interface BoardFiltersState {
  type: IssueType | "";
  priority: IssuePriority | "";
  assignee: string;
  search: string;
}

export interface BoardMember {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

interface BoardFiltersProps {
  filters: BoardFiltersState;
  onFilterChange: (filters: BoardFiltersState) => void;
  members?: BoardMember[];
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

function MemberAvatar({ member, size = "sm" }: { member: BoardMember; size?: "sm" | "xs" }) {
  const sizeClass = size === "xs" ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]";
  const initials = member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (member.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={member.image} alt={member.name} className={cn("rounded-full object-cover shrink-0", sizeClass)} title={member.name} />
    );
  }
  return (
    <span className={cn("rounded-full bg-primary/20 text-primary font-medium flex items-center justify-center shrink-0", sizeClass)}>
      {initials}
    </span>
  );
}

function AssigneeFilter({
  members,
  value,
  onChange,
}: {
  members: BoardMember[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = members.find((m) => m._id === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm border rounded-[3px] bg-white transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          value ? "border-primary/50 text-foreground" : "border-input text-muted-foreground hover:border-input/80"
        )}
      >
        {selected ? (
          <>
            <MemberAvatar member={selected} size="xs" />
            <span className="max-w-[80px] truncate text-foreground">{selected.name.split(" ")[0]}</span>
          </>
        ) : (
          <>
            <Users className="w-4 h-4" />
            <span>Assignee</span>
          </>
        )}
        <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-border rounded-[3px] shadow-lg min-w-[180px] max-h-56 overflow-y-auto">
          {/* Clear option */}
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors text-muted-foreground"
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">All assignees</span>
            {!value && <Check className="w-4 h-4 text-primary shrink-0" />}
          </button>

          {members.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No project members yet.</div>
          ) : (
            members.map((member) => (
              <button
                key={member._id}
                type="button"
                onClick={() => { onChange(member._id); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors"
              >
                <MemberAvatar member={member} />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-foreground truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
                {value === member._id && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function BoardFilters({ filters, onFilterChange, members = [] }: BoardFiltersProps) {
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
          <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
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
          <option key={opt.value || "all"} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <AssigneeFilter
        members={members}
        value={filters.assignee}
        onChange={(id) => update({ assignee: id })}
      />
    </div>
  );
}
