"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useUIStore } from "@/store/uiStore";
import type { IProject, IIssue } from "@/types";
import { KanbanColumn } from "./KanbanColumn";
import toast from "react-hot-toast";

interface KanbanBoardProps {
  project: IProject;
  issues: IIssue[];
  onRefresh: () => void;
  onIssueClick?: (id: string) => void;
}

export function KanbanBoard({
  project,
  issues,
  onRefresh,
  onIssueClick,
}: KanbanBoardProps) {
  const { setCreateIssueOpen } = useUIStore();
  const [localIssues, setLocalIssues] = useState<IIssue[]>(issues);

  useEffect(() => {
    setLocalIssues(issues);
  }, [issues]);

  const issuesToUse = localIssues;

  const columns = useMemo(
    () => (project.columns ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [project.columns]
  );
  const columnIds = useMemo(() => new Set(columns.map((c) => c.id)), [columns]);

  const issuesByColumn = useMemo(() => {
    const map = new Map<string, IIssue[]>();
    for (const col of columns) {
      map.set(
        col.id,
        issuesToUse
          .filter((i) => i.status === col.id)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      );
    }
    return map;
  }, [columns, issuesToUse]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const patchIssue = useCallback(
    async (issueId: string, updates: { status?: string; order?: number }) => {
      try {
        const res = await fetch(`/api/issues/${issueId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error("Failed to update");
        onRefresh();
      } catch {
        toast.error("Failed to update issue");
        onRefresh();
      }
    },
    [onRefresh]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const draggedIssue = issuesToUse.find((i) => i._id === activeId);
      if (!draggedIssue) return;

      let targetColumnId: string;
      let insertIndex: number;

      if (columnIds.has(overId)) {
        targetColumnId = overId;
        const colIssues = issuesByColumn.get(overId) ?? [];
        insertIndex = colIssues.length;
      } else {
        const overIssue = issuesToUse.find((i) => i._id === overId);
        if (!overIssue) return;
        targetColumnId = overIssue.status;
        const colIssues = issuesByColumn.get(targetColumnId) ?? [];
        const idx = colIssues.findIndex((i) => i._id === overId);
        insertIndex = idx >= 0 ? idx : colIssues.length;
      }

      const sameColumn = draggedIssue.status === targetColumnId;
      const colIssues = issuesByColumn.get(targetColumnId) ?? [];
      let oldIndex = -1;
      if (sameColumn) {
        oldIndex = colIssues.findIndex((i) => i._id === activeId);
        if (oldIndex === insertIndex) return;
        if (insertIndex > oldIndex) insertIndex -= 1;
      }

      const newOrder = insertIndex;

      const withoutDragged = issuesToUse.filter((i) => i._id !== activeId);
      const targetList = withoutDragged.filter((i) => i.status === targetColumnId);
      const others = withoutDragged.filter((i) => i.status !== targetColumnId);
      const moved = { ...draggedIssue, status: targetColumnId, order: newOrder };
      targetList.splice(insertIndex, 0, moved);
      const newIssues = [...others, ...targetList];
      setLocalIssues(newIssues);

      if (sameColumn) {
        await patchIssue(activeId, { order: newOrder });
      } else {
        await patchIssue(activeId, { status: targetColumnId, order: newOrder });
      }
    },
    [issuesToUse, issuesByColumn, columnIds, patchIssue]
  );

  const handleQuickAdd = useCallback(() => {
    setCreateIssueOpen(true);
  }, [setCreateIssueOpen]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-0 flex-1">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            issues={issuesByColumn.get(column.id) ?? []}
            onIssueClick={onIssueClick ?? (() => {})}
            onQuickAdd={handleQuickAdd}
          />
        ))}
      </div>
    </DndContext>
  );
}
