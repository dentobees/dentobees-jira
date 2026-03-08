"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, FolderKanban, Users, ArrowRight } from "lucide-react";
import { useSidebarData } from "@/hooks/useSidebarData";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/cn";

interface WorkspaceMemberEntry {
  user: string | { _id?: string };
  role: "owner" | "admin" | "member" | "viewer";
}

interface WorkspaceData {
  _id: string;
  name: string;
  slug: string;
  projects: { _id: string; name: string; key: string }[];
  members?: WorkspaceMemberEntry[];
}

interface ProjectData {
  _id: string;
  name: string;
  key: string;
  members?: unknown[];
}

export default function WorkspaceOverviewPage() {
  const params = useParams();
  const workspaceSlug = params.workspace as string;
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const isViewer = useUIStore((s) => s.currentUserWorkspaceRole === "viewer");

  useSidebarData(
    workspace ? { _id: workspace._id, name: workspace.name, slug: workspace.slug } : null,
    workspace?.projects ?? null,
    null
  );
  useWorkspaceRole(workspace?.members);

  useEffect(() => {
    const load = async () => {
      try {
        const wsRes = await fetch("/api/workspaces");
        if (!wsRes.ok) return;
        const workspaces = await wsRes.json();
        const matched = workspaces.find((ws: { slug: string }) => ws.slug === workspaceSlug);
        if (!matched) { setNotFound(true); setLoading(false); return; }

        const fullRes = await fetch(`/api/workspaces/${matched._id}`);
        if (!fullRes.ok) { setNotFound(true); setLoading(false); return; }
        const fullWorkspace = await fullRes.json();
        setWorkspace(fullWorkspace);

        const projRes = await fetch(`/api/projects?workspaceId=${matched._id}`);
        if (projRes.ok) setProjects(await projRes.json());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspaceSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded bg-secondary" />
          <div className="w-32 h-4 rounded bg-secondary" />
        </div>
      </div>
    );
  }

  if (notFound || !workspace) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <p className="text-muted-foreground">Workspace not found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{workspace.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Projects in this workspace</p>
        </div>
        {!isViewer && (
          <Link
            href={`/${workspace.slug}/projects/new`}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-[3px]",
              "hover:bg-primary-hover transition-colors"
            )}
          >
            <Plus className="w-4 h-4" />
            Create Project
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border border-border rounded-[3px] p-12 text-center">
          <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">No projects yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Create your first project to start tracking issues and managing your backlog.
          </p>
          {!isViewer && (
            <Link
              href={`/${workspace.slug}/projects/new`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-[3px] hover:bg-primary-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project._id}
              href={`/${workspace.slug}/projects/${project._id}/board`}
              className="group bg-white border border-border rounded-[3px] p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-[3px] bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{project.key}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{project.name}</h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {project.members?.length ?? 0} members
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
