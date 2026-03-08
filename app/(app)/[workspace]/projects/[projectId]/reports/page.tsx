"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSidebarData } from "@/hooks/useSidebarData";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { cn } from "@/lib/cn";
import type { IIssue, IWorkspace, IProject, ISprint } from "@/types";

const PRIORITY_ORDER = ["urgent", "high", "medium", "low", "none"] as const;
const TYPE_ORDER = ["bug", "story", "task", "epic", "subtask"] as const;

export default function ReportsPage() {
  const params = useParams();
  const workspaceSlug = params.workspace as string;
  const projectId = params.projectId as string;

  const [workspace, setWorkspace] = useState<IWorkspace | null>(null);
  const [project, setProject] = useState<IProject | null>(null);
  const [sprints, setSprints] = useState<ISprint[]>([]);
  const [issues, setIssues] = useState<IIssue[]>([]);
  const [projects, setProjects] = useState<{ _id: string; name: string; key: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

      const [sprintsRes, issuesRes] = await Promise.all([
        fetch(`/api/sprints?projectId=${projectId}`),
        fetch(`/api/issues?projectId=${projectId}`),
      ]);
      if (sprintsRes.ok) {
        const sprintsData = await sprintsRes.json();
        setSprints(sprintsData);
      }
      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        setIssues(issuesData);
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

  const stats = useMemo(() => {
    const total = issues.length;
    const columns = project?.columns ?? [];
    const doneColumn = columns.find((c) => /done/i.test(c.name ?? ""));
    const doneId = doneColumn?.id;
    const open = issues.filter((i) => i.status !== doneId).length;
    const inProgress = issues.filter((i) => {
      const col = columns.find((c) => c.id === i.status);
      return col && /progress|review/i.test(col.name ?? "");
    }).length;
    const done = doneId ? issues.filter((i) => i.status === doneId).length : 0;

    const byStatus = columns.reduce(
      (acc, col) => {
        acc[col.name ?? col.id] = issues.filter((i) => i.status === col.id).length;
        return acc;
      },
      {} as Record<string, number>
    );

    const byPriority = PRIORITY_ORDER.reduce(
      (acc, p) => {
        acc[p] = issues.filter((i) => i.priority === p).length;
        return acc;
      },
      {} as Record<string, number>
    );

    const byType = TYPE_ORDER.reduce(
      (acc, t) => {
        acc[t] = issues.filter((i) => i.type === t).length;
        return acc;
      },
      {} as Record<string, number>
    );

    const activeSprint = sprints.find((s) => s.status === "active");
    const activeSprintIssues = activeSprint
      ? issues.filter((i) => i.sprint && (typeof i.sprint === "string" ? i.sprint === activeSprint._id : (i.sprint as { _id?: string })?._id === activeSprint._id))
      : [];
    const activeSprintDone = doneId
      ? activeSprintIssues.filter((i) => i.status === doneId).length
      : 0;

    return {
      total,
      open,
      inProgress,
      done,
      byStatus,
      byPriority,
      byType,
      activeSprint,
      activeSprintTotal: activeSprintIssues.length,
      activeSprintDone,
    };
  }, [issues, project, sprints]);

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

  const maxStatus = Math.max(...Object.values(stats.byStatus), 1);
  const maxPriority = Math.max(...Object.values(stats.byPriority), 1);

  const statusColors: Record<string, string> = {};
  (project.columns ?? []).forEach((c, i) => {
    statusColors[c.name ?? c.id] = c.color ?? ["#dfe1e6", "#0052cc", "#ff991f", "#00875a"][i % 4];
  });

  return (
    <>
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Reports</h1>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
            {project.name}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-border rounded-[3px] p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total Issues</div>
            <div className="text-2xl font-semibold text-foreground">{stats.total}</div>
          </div>
          <div className="bg-white border border-border rounded-[3px] p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Open</div>
            <div className="text-2xl font-semibold text-foreground">{stats.open}</div>
          </div>
          <div className="bg-white border border-border rounded-[3px] p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">In Progress</div>
            <div className="text-2xl font-semibold text-foreground">{stats.inProgress}</div>
          </div>
          <div className="bg-white border border-border rounded-[3px] p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Done</div>
            <div className="text-2xl font-semibold text-foreground">{stats.done}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-border rounded-[3px] p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Issues by Status</h3>
            <div className="space-y-2">
              {Object.entries(stats.byStatus).map(([name, count]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">{name}</span>
                  <div className="flex-1 h-6 bg-secondary rounded-[3px] overflow-hidden">
                    <div
                      className="h-full rounded-[3px] transition-all"
                      style={{
                        width: `${(count / maxStatus) * 100}%`,
                        backgroundColor: statusColors[name] ?? "#0052cc",
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-border rounded-[3px] p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Issues by Priority</h3>
            <div className="space-y-2">
              {PRIORITY_ORDER.map((p) => {
                const count = stats.byPriority[p] ?? 0;
                const colors: Record<string, string> = {
                  urgent: "#de350b",
                  high: "#ff5630",
                  medium: "#ff991f",
                  low: "#0065ff",
                  none: "#6b778c",
                };
                return (
                  <div key={p} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16 shrink-0 capitalize">{p}</span>
                    <div className="flex-1 h-6 bg-secondary rounded-[3px] overflow-hidden">
                      <div
                        className="h-full rounded-[3px] transition-all"
                        style={{
                          width: `${(count / maxPriority) * 100}%`,
                          backgroundColor: colors[p],
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-border rounded-[3px] p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Issues by Type</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TYPE_ORDER.map((t) => (
                <div
                  key={t}
                  className={cn(
                    "p-3 rounded-[3px] border border-border",
                    "bg-secondary/30"
                  )}
                >
                  <div className="text-xs uppercase tracking-wider text-muted-foreground capitalize">{t}</div>
                  <div className="text-xl font-semibold text-foreground mt-0.5">
                    {stats.byType[t] ?? 0}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {stats.activeSprint && (
            <div className="bg-white border border-border rounded-[3px] p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">Active Sprint Progress</h3>
              <p className="text-xs text-muted-foreground mb-2">{stats.activeSprint.name}</p>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-2xl font-semibold text-foreground">
                  {stats.activeSprintDone} / {stats.activeSprintTotal}
                </span>
                <span className="text-sm text-muted-foreground">done</span>
              </div>
              <div className="h-4 bg-secondary rounded-[3px] overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-[3px] transition-all"
                  style={{
                    width: stats.activeSprintTotal > 0
                      ? `${(stats.activeSprintDone / stats.activeSprintTotal) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
