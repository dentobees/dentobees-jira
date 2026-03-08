"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useSidebarData } from "@/hooks/useSidebarData";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { IssueTypeBadge } from "@/components/issues/IssueTypeBadge";
import { IssuePriorityBadge } from "@/components/issues/IssuePriorityBadge";
import { IssueDetailModal } from "@/components/issues/IssueDetailModal";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/cn";
import type { IIssue, IUser, IWorkspace, IProject } from "@/types";
import toast from "react-hot-toast";

type SortKey = "priority" | "created" | "title";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

function UserAvatar({ user }: { user: IUser }) {
  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt={user.name}
        className="size-6 rounded-full object-cover border border-border"
        title={user.name}
      />
    );
  }
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <span
      className="size-6 rounded-full bg-primary/20 text-primary text-[10px] font-medium flex items-center justify-center border border-border"
      title={user.name}
    >
      {initials}
    </span>
  );
}

export default function BacklogPage() {
  const params = useParams();
  const workspaceSlug = params.workspace as string;
  const projectId = params.projectId as string;
  const { setCreateIssueOpen, currentUserWorkspaceRole } = useUIStore();
  const isViewer = currentUserWorkspaceRole === "viewer";

  const [workspace, setWorkspace] = useState<IWorkspace | null>(null);
  const [project, setProject] = useState<IProject | null>(null);
  const [issues, setIssues] = useState<IIssue[]>([]);
  const [projects, setProjects] = useState<{ _id: string; name: string; key: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailIssueId, setDetailIssueId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [moveToSprintOpen, setMoveToSprintOpen] = useState(false);
  const [sprints, setSprints] = useState<{ _id: string; name: string }[]>([]);
  const [moving, setMoving] = useState(false);

  // Must be called unconditionally — before any early returns
  useSidebarData(
    workspace ? { _id: workspace._id, name: workspace.name, slug: workspace.slug } : null,
    projects,
    project ? { _id: project._id, name: project.name, key: project.key } : null
  );
  useWorkspaceRole(workspace?.members);

  const fetchData = useCallback(async () => {
    try {
      const wsRes = await fetch("/api/workspaces");
      if (!wsRes.ok) return;
      const workspaces = await wsRes.json();
      const matched = workspaces.find((ws: { slug: string }) => ws.slug === workspaceSlug);
      if (!matched) {
        setNotFound(true);
        return;
      }
      const fullRes = await fetch(`/api/workspaces/${matched._id}`);
      if (!fullRes.ok) {
        setNotFound(true);
        return;
      }
      const fullWorkspace = await fullRes.json();
      setWorkspace(fullWorkspace);
      setProjects(fullWorkspace.projects ?? []);

      const projRes = await fetch(`/api/projects/${projectId}`);
      if (!projRes.ok) {
        setNotFound(true);
        return;
      }
      const projData = await projRes.json();
      setProject(projData);

      const issuesRes = await fetch(`/api/issues?projectId=${projectId}&sprint=null`);
      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        setIssues(Array.isArray(issuesData) ? issuesData : []);
      } else {
        console.error("[BacklogPage] issues fetch failed:", issuesRes.status);
        toast.error("Failed to load backlog issues");
      }

      const sprintsRes = await fetch(`/api/sprints?projectId=${projectId}`);
      if (sprintsRes.ok) {
        const sprintsData = await sprintsRes.json();
        setSprints(sprintsData.filter((s: { status: string }) => s.status !== "completed"));
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedIssues = [...issues].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "priority") {
      cmp = (PRIORITY_ORDER[a.priority] ?? 5) - (PRIORITY_ORDER[b.priority] ?? 5);
    } else if (sortKey === "created") {
      cmp =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else {
      cmp = a.title.localeCompare(b.title);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === issues.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(issues.map((i) => i._id)));
    }
  };

  const handleMoveToSprint = async (sprintId: string) => {
    if (selectedIds.size === 0) return;
    setMoving(true);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/issues/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sprint: sprintId }),
        })
      );
      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        toast.error(`Failed to move ${failed.length} issue(s)`);
      } else {
        toast.success(`Moved ${selectedIds.size} issue(s) to sprint`);
        setSelectedIds(new Set());
        setMoveToSprintOpen(false);
        fetchData();
      }
    } catch {
      toast.error("Failed to move issues");
    } finally {
      setMoving(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-[calc(100vh-56px)]">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded bg-secondary" />
            <div className="w-32 h-4 rounded bg-secondary" />
          </div>
        </div>
      </>
    );
  }

  if (notFound || !workspace || !project) {
    return (
      <>
        <div className="flex items-center justify-center h-[calc(100vh-56px)]">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Backlog</h1>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
              {project.name} — Issues not in a sprint
            </p>
          </div>
          {!isViewer && (
            <button
              onClick={() => setCreateIssueOpen(true)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-[3px]",
                "hover:bg-primary-hover transition-colors"
              )}
            >
              <Plus className="w-4 h-4" />
              Create Issue
            </button>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 mb-4 py-2 px-4 bg-secondary/50 border border-border rounded-[3px]">
            <span className="text-sm text-foreground">{selectedIds.size} selected</span>
            <button
              onClick={() => setMoveToSprintOpen(true)}
              className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-[3px] hover:bg-primary-hover"
            >
              Move to Sprint
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-[3px]"
            >
              Clear
            </button>
          </div>
        )}

        {moveToSprintOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => !moving && setMoveToSprintOpen(false)}
          >
            <div
              className="bg-white border border-border shadow-lg rounded-[3px] max-w-sm w-full mx-4 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold mb-3">Move to Sprint</h3>
              {sprints.length === 0 ? (
                <p className="text-sm text-muted-foreground mb-4">No sprint available. Create one first.</p>
              ) : (
                <div className="space-y-2">
                  {sprints.map((s) => (
                    <button
                      key={s._id}
                      onClick={() => handleMoveToSprint(s._id)}
                      disabled={moving}
                      className="w-full px-3 py-2 text-sm text-left bg-secondary/50 hover:bg-secondary rounded-[3px] disabled:opacity-50"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setMoveToSprintOpen(false)}
                className="mt-4 w-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary rounded-[3px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-border rounded-[3px] overflow-hidden">
          {sortedIssues.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground mb-0.5">No backlog issues</p>
              <p className="text-sm text-muted-foreground">Issues not in a sprint appear here.</p>
              <button
                onClick={() => setCreateIssueOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-[3px] hover:bg-primary-hover"
              >
                <Plus className="w-4 h-4" />
                Create Issue
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="w-10 px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === issues.length && issues.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground w-12">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground w-24">
                    Key
                  </th>
                  <th
                    className={cn(
                      "px-3 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground",
                      sortKey === "title" && "text-foreground"
                    )}
                    onClick={() => toggleSort("title")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Title
                      {sortKey === "title" ? sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </span>
                  </th>
                  <th
                    className={cn(
                      "px-3 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground w-24",
                      sortKey === "priority" && "text-foreground"
                    )}
                    onClick={() => toggleSort("priority")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Priority
                      {sortKey === "priority" ? sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </span>
                  </th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground w-20">
                    Assignees
                  </th>
                  <th
                    className={cn(
                      "px-3 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground w-28",
                      sortKey === "created" && "text-foreground"
                    )}
                    onClick={() => toggleSort("created")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Created
                      {sortKey === "created" ? sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </span>
                  </th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground w-24">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedIssues.map((issue, idx) => (
                  <tr
                    key={issue._id}
                    onClick={() => setDetailIssueId(issue._id)}
                    className={cn(
                      "border-b border-border cursor-pointer transition-colors",
                      idx % 2 === 1 ? "bg-secondary/20" : "bg-white",
                      "hover:bg-secondary"
                    )}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(issue._id)}
                        onChange={() => toggleSelect(issue._id)}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <IssueTypeBadge type={issue.type} />
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground">{issue.key}</td>
                    <td className="px-3 py-2 text-foreground">{issue.title}</td>
                    <td className="px-3 py-2">
                      <IssuePriorityBadge priority={issue.priority} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex -space-x-1.5">
                        {(issue.assignees ?? []).map((a) =>
                          typeof a === "string" ? null : (
                            <UserAvatar key={a._id} user={a} />
                          )
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs px-2 py-0.5 rounded-[3px] bg-secondary text-secondary-foreground">
                        {project.columns?.find((c) => c.id === issue.status)?.name ?? issue.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <CreateIssueModal projectId={projectId} onCreated={fetchData} />
      {detailIssueId && (
        <IssueDetailModal
          issueId={detailIssueId}
          onClose={() => setDetailIssueId(null)}
          onUpdated={fetchData}
        />
      )}
    </>
  );
}
