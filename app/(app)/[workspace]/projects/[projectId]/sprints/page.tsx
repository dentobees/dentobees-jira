"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Plus, ChevronDown, ChevronRight, Play, CheckCircle, X } from "lucide-react";
import { useSidebarData } from "@/hooks/useSidebarData";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { useUIStore } from "@/store/uiStore";
import { IssueTypeBadge } from "@/components/issues/IssueTypeBadge";
import { IssuePriorityBadge } from "@/components/issues/IssuePriorityBadge";
import { IssueDetailModal } from "@/components/issues/IssueDetailModal";
import { cn } from "@/lib/cn";
import type { IIssue, IUser, IWorkspace, IProject, ISprint } from "@/types";
import toast from "react-hot-toast";
import { format } from "date-fns";

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

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "planning"
      ? "bg-gray-100 text-gray-700"
      : status === "active"
        ? "bg-blue-50 text-blue-700"
        : "bg-green-50 text-green-700";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded-[3px] font-medium", styles)}>
      {label}
    </span>
  );
}

interface SprintWithIssues extends Omit<ISprint, "issues"> {
  issues: (IIssue & { assignees?: (string | IUser)[] })[];
}

export default function SprintsPage() {
  const params = useParams();
  const workspaceSlug = params.workspace as string;
  const projectId = params.projectId as string;
  const isViewer = useUIStore((s) => s.currentUserWorkspaceRole === "viewer");

  const [workspace, setWorkspace] = useState<IWorkspace | null>(null);
  const [project, setProject] = useState<IProject | null>(null);
  const [sprints, setSprints] = useState<SprintWithIssues[]>([]);
  const [projects, setProjects] = useState<{ _id: string; name: string; key: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [detailIssueId, setDetailIssueId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    goal: "",
    startDate: "",
    endDate: "",
  });
  const [creating, setCreating] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

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

      const sprintsRes = await fetch(`/api/sprints?projectId=${projectId}`);
      if (sprintsRes.ok) {
        const sprintsData = await sprintsRes.json();
        setSprints(sprintsData);
        setExpandedIds((prev) => {
          const next = new Set(prev);
          sprintsData.forEach((s: SprintWithIssues) => {
            if (s.status === "active" || s.status === "planning") next.add(s._id);
            if (s.status === "completed") next.delete(s._id);
          });
          return next;
        });
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

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          goal: createForm.goal.trim(),
          projectId,
          startDate: createForm.startDate || undefined,
          endDate: createForm.endDate || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create sprint");
      toast.success("Sprint created");
      setCreateForm({ name: "", goal: "", startDate: "", endDate: "" });
      setCreateOpen(false);
      fetchData();
    } catch {
      toast.error("Failed to create sprint");
    } finally {
      setCreating(false);
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    setActioning(sprintId);
    try {
      const res = await fetch(`/api/sprints/${sprintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to start sprint");
      }
      toast.success("Sprint started");
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start sprint");
    } finally {
      setActioning(null);
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    setActioning(sprintId);
    try {
      const res = await fetch(`/api/sprints/${sprintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) throw new Error("Failed to complete sprint");
      toast.success("Sprint completed");
      fetchData();
    } catch {
      toast.error("Failed to complete sprint");
    } finally {
      setActioning(null);
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
            <h1 className="text-xl font-semibold text-foreground">Sprints</h1>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
              {project.name}
            </p>
          </div>
          {!isViewer && (
            <button
              onClick={() => setCreateOpen(true)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-[3px]",
                "hover:bg-primary-hover transition-colors"
              )}
            >
              <Plus className="w-4 h-4" />
              Create Sprint
            </button>
          )}
        </div>

        {createOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => !creating && setCreateOpen(false)}
          >
            <div
              className="bg-white border border-border shadow-lg rounded-[3px] max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="text-base font-semibold">Create Sprint</h2>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="p-1 rounded-[3px] text-muted-foreground hover:bg-secondary"
                >
                  <X className="size-4" />
                </button>
              </div>
              <form onSubmit={handleCreateSprint} className="p-4 space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Name *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Sprint name"
                    className="w-full px-3 py-2 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Goal</label>
                  <input
                    type="text"
                    value={createForm.goal}
                    onChange={(e) => setCreateForm((f) => ({ ...f, goal: e.target.value }))}
                    placeholder="Sprint goal"
                    className="w-full px-3 py-2 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Start Date</label>
                    <input
                      type="date"
                      value={createForm.startDate}
                      onChange={(e) => setCreateForm((f) => ({ ...f, startDate: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">End Date</label>
                    <input
                      type="date"
                      value={createForm.endDate}
                      onChange={(e) => setCreateForm((f) => ({ ...f, endDate: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary rounded-[3px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-[3px] hover:bg-primary-hover disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {sprints.length === 0 ? (
            <div className="bg-white border border-border rounded-[3px] p-12 text-center">
              <p className="text-muted-foreground mb-0.5">No sprints yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create a sprint to plan your work.</p>
              {!isViewer && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-[3px] hover:bg-primary-hover"
                >
                  <Plus className="w-4 h-4" />
                  Create Sprint
                </button>
              )}
            </div>
          ) : (
            sprints.map((sprint) => {
              const isExpanded = expandedIds.has(sprint._id);
              const issues = sprint.issues ?? [];
              const storyPoints = issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
              const isActive = sprint.status === "active";

              return (
                <div
                  key={sprint._id}
                  className={cn(
                    "bg-white border border-border rounded-[3px] overflow-hidden",
                    isActive && "border-l-4 border-l-primary"
                  )}
                >
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => toggleExpand(sprint._id)}
                  >
                    <button className="p-0.5 rounded-[3px] hover:bg-secondary">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{sprint.name}</span>
                        <StatusBadge status={sprint.status} />
                        {(sprint.startDate || sprint.endDate) && (
                          <span className="text-xs text-muted-foreground">
                            {sprint.startDate && format(new Date(sprint.startDate), "MMM d")}
                            {sprint.startDate && sprint.endDate && " – "}
                            {sprint.endDate && format(new Date(sprint.endDate), "MMM d")}
                          </span>
                        )}
                      </div>
                      {sprint.goal && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{sprint.goal}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <span>{issues.length} issues</span>
                      <span>{storyPoints} pts</span>
                    </div>
                    {!isViewer && (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {sprint.status === "planning" && (
                          <button
                            onClick={() => handleStartSprint(sprint._id)}
                            disabled={actioning === sprint._id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-[3px] hover:bg-primary-hover disabled:opacity-50"
                          >
                            <Play className="w-3 h-3" />
                            Start Sprint
                          </button>
                        )}
                        {sprint.status === "active" && (
                          <button
                            onClick={() => handleCompleteSprint(sprint._id)}
                            disabled={actioning === sprint._id}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-600 text-white rounded-[3px] hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Complete Sprint
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isExpanded && issues.length > 0 && (
                    <div className="border-t border-border bg-secondary/20">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-4 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground w-12">Type</th>
                            <th className="px-4 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground w-24">Key</th>
                            <th className="px-4 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground">Title</th>
                            <th className="px-4 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground w-24">Priority</th>
                            <th className="px-4 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground w-20">Assignees</th>
                            <th className="px-4 py-2 text-left text-xs uppercase tracking-wider text-muted-foreground w-24">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {issues.map((issue, idx) => (
                            <tr
                              key={issue._id}
                              onClick={() => setDetailIssueId(issue._id)}
                              className={cn(
                                "border-b border-border last:border-b-0 cursor-pointer transition-colors",
                                idx % 2 === 1 ? "bg-white/50" : "bg-transparent",
                                "hover:bg-secondary"
                              )}
                            >
                              <td className="px-4 py-2">
                                <IssueTypeBadge type={issue.type} />
                              </td>
                              <td className="px-4 py-2 font-medium text-foreground">{issue.key}</td>
                              <td className="px-4 py-2 text-foreground">{issue.title}</td>
                              <td className="px-4 py-2">
                                <IssuePriorityBadge priority={issue.priority} />
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex -space-x-1.5">
                                  {(issue.assignees ?? []).map((a) =>
                                    typeof a === "string" ? null : (
                                      <UserAvatar key={a._id} user={a} />
                                    )
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <span className="text-xs px-2 py-0.5 rounded-[3px] bg-secondary text-secondary-foreground">
                                  {project.columns?.find((c) => c.id === issue.status)?.name ?? issue.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {isExpanded && issues.length === 0 && (
                    <div className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">
                      No issues in this sprint
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

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
