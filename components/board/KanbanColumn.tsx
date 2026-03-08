"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import type { BoardColumn, IIssue } from "@/types";
import { IssueCard } from "@/components/issues/IssueCard";
import { SortableItem } from "./SortableItem";

interface KanbanColumnProps {
  column: BoardColumn;
  issues: IIssue[];
  onIssueClick: (id: string) => void;
  onQuickAdd?: () => void;
}

export function KanbanColumn({
  column,
  issues,
  onIssueClick,
  onQuickAdd,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const issueIds = issues.map((i) => i._id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 shrink-0 flex flex-col min-h-[200px] rounded p-2 bg-[#f4f5f7]",
        isOver && "ring-2 ring-primary/40 ring-inset"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 mb-2 rounded border-l-4",
          "font-semibold text-sm text-foreground"
        )}
        style={{ borderLeftColor: column.color }}
      >
        <span>{column.name}</span>
        <span className="text-xs font-normal text-muted-foreground bg-white/60 px-1.5 py-0.5 rounded">
          {issues.length}
        </span>
      </div>

      <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          {issues.map((issue) => (
            <SortableItem key={issue._id} id={issue._id}>
              <IssueCard
                issue={issue}
                onClick={() => onIssueClick(issue._id)}
              />
            </SortableItem>
          ))}
        </div>
      </SortableContext>

      {onQuickAdd && (
        <button
          type="button"
          onClick={onQuickAdd}
          className="mt-2 flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/50 rounded transition-colors w-full justify-start"
        >
          <Plus className="size-4" />
          Quick add
        </button>
      )}
    </div>
  );
}
