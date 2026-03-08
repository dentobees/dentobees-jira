"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderKanban, Users, ArrowRight } from "lucide-react";
import { useSidebarData } from "@/hooks/useSidebarData";
import Link from "next/link";

interface Workspace {
  _id: string;
  name: string;
  slug: string;
  members: { user: string; role: string }[];
  projects: string[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useSidebarData(null, null, null);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await fetch("/api/workspaces");
        if (res.ok) {
          const data = await res.json();
          setWorkspaces(data);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspaces();
  }, []);

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

  if (workspaces.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-lg bg-accent flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to Dentobees Jira</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Create your first workspace to start managing projects and tracking issues with your team.
          </p>
          <button
            onClick={() => router.push("/onboarding")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-[3px] hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Your Workspaces</h1>
        <p className="text-sm text-muted-foreground mt-1">Select a workspace to view its projects</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map((ws) => (
          <Link
            key={ws._id}
            href={`/${ws.slug}`}
            className="group bg-white border border-border rounded-md p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-primary" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">{ws.name}</h3>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {ws.members.length} members
              </span>
              <span className="flex items-center gap-1">
                <FolderKanban className="w-3.5 h-3.5" />
                {ws.projects.length} projects
              </span>
            </div>
          </Link>
        ))}

        <button
          onClick={() => router.push("/onboarding")}
          className="border-2 border-dashed border-border rounded-md p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer min-h-[140px]"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">New Workspace</span>
        </button>
      </div>
    </div>
  );
}
