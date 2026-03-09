"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { useSidebarData } from "@/hooks/useSidebarData";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { KanbanBoard } from "@/components/board/KanbanBoard";
import { BoardFilters, type BoardFiltersState } from "@/components/board/BoardFilters";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { IssueDetailModal } from "@/components/issues/IssueDetailModal";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/cn";
import type { IProject, IIssue, IWorkspace } from "@/types";

export default function BoardPage() {
  const params = useParams();
  const workspaceSlug = params.workspace as string;
  const projectId = params.projectId as string;

  const { setCreateIssueOpen, currentUserWorkspaceRole } = useUIStore();
  const isViewer = currentUserWorkspaceRole === "viewer";
  const [workspace, setWorkspace] = useState<IWorkspace | null>(null);
  const [project, setProject] = useState<IProject | null>(null);
  const [projects, setProjects] = useState<{ _id: string; name: string; key: string }[]>([]);

  useSidebarData(
    workspace ? { _id: workspace._id, name: workspace.name, slug: workspace.slug } : null,
    projects,
    project ? { _id: project._id, name: project.name, key: project.key } : null
  );
  useWorkspaceRole(workspace?.members);
  const [issues, setIssues] = useState<IIssue[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [filters, setFilters] = useState<BoardFiltersState>({
    type: "",
    priority: "",
    assignee: "",
    search: "",
  });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchIssues = useCallback(async () => {
    if (!projectId) return;
    const params = new URLSearchParams({ projectId });
    if (filters.type) params.set("type", filters.type);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.assignee) params.set("assignee", filters.assignee);
    if (filters.search) params.set("search", filters.search);
    try {
      const res = await fetch(`/api/issues?${params}`);
      if (res.ok) {
        const data = await res.json();
        setIssues(data);
      }
    } catch {
      // ignore
    }
  }, [projectId, filters]);

  useEffect(() => {
    const load = async () => {
      try {
        const wsRes = await fetch("/api/workspaces");
        if (!wsRes.ok) return;
        const workspaces = await wsRes.json();
        const matched = workspaces.find((ws: { slug: string }) => ws.slug === workspaceSlug);
        if (!matched) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const fullRes = await fetch(`/api/workspaces/${matched._id}`);
        if (!fullRes.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const fullWorkspace = await fullRes.json();
        setWorkspace(fullWorkspace);
        setProjects(fullWorkspace.projects ?? []);

        const projRes = await fetch(`/api/projects/${projectId}`);
        if (!projRes.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const projData = await projRes.json();
        setProject(projData);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspaceSlug, projectId]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleRefresh = useCallback(() => {
    fetchIssues();
  }, [fetchIssues]);

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
      <div className="flex flex-col flex-1 min-h-0">
        <div className="mb-4">
          <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <Link href={`/${workspace.slug}`} className="hover:text-foreground">
              {workspace.name}
            </Link>
            <ChevronRight className="size-4" />
            <span className="text-foreground">{project.name}</span>
          </nav>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">
              {project.name}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {project.key}
              </span>
            </h1>
            {!isViewer && (
              <button
                type="button"
                onClick={() => setCreateIssueOpen(true)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-[3px]",
                  "hover:bg-primary-hover transition-colors"
                )}
              >
                <Plus className="size-4" />
                Create
              </button>
            )}
          </div>
        </div>

        <BoardFilters
          filters={filters}
          onFilterChange={setFilters}
          members={(project.members as unknown as { _id: string; name: string; email: string; image?: string }[]).filter(
            (m) => typeof m === "object" && m !== null && "_id" in m
          )}
        />

        <div className="flex-1 min-h-[500px] flex flex-col">
          <KanbanBoard
            project={project}
            issues={issues}
            onRefresh={handleRefresh}
            onIssueClick={setSelectedIssueId}
          />
        </div>
      </div>

      <CreateIssueModal projectId={projectId} onCreated={handleRefresh} />
      <IssueDetailModal
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        onUpdated={handleRefresh}
      />
    </>
  );
}
