"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSidebarData } from "@/hooks/useSidebarData";
import { cn } from "@/lib/cn";

function generateKeyFromName(name: string): string {
  const firstWord = name.trim().split(/\s+/)[0] || "";
  const len = firstWord.length >= 3 ? 3 : 2;
  return firstWord.slice(0, len).toUpperCase();
}

interface WorkspaceData {
  _id: string;
  name: string;
  slug: string;
}

export default function CreateProjectPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspace as string;
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);

  useSidebarData(
    workspace ? { _id: workspace._id, name: workspace.name, slug: workspace.slug } : null,
    null,
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const wsRes = await fetch("/api/workspaces");
        if (!wsRes.ok) return;
        const workspaces = await wsRes.json();
        const matched = workspaces.find((ws: { slug: string }) => ws.slug === workspaceSlug);
        if (matched) setWorkspace(matched);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspaceSlug]);

  const handleNameChange = (value: string) => {
    setName(value);
    setKey(generateKeyFromName(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          key: key.trim().toUpperCase(),
          description: description.trim() || undefined,
          workspaceId: workspace._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create project");
        return;
      }
      router.push(`/${workspace.slug}/projects/${data._id}/board`);
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
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

  if (!workspace) {
    return (
      <>
        <div className="flex items-center justify-center h-[calc(100vh-56px)]">
          <p className="text-muted-foreground">Workspace not found</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <Link
          href={`/${workspace.slug}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to workspace
        </Link>

        <div className="max-w-lg">
          <div className="bg-white border border-border rounded-[3px] p-6">
            <h1 className="text-xl font-semibold text-foreground mb-6">Create project</h1>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                  Project name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Marketing Campaign"
                  required
                  className={cn(
                    "w-full px-3 py-2 border border-input rounded-[3px] text-sm text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  )}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                  Project key
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  placeholder="e.g. MC"
                  required
                  maxLength={10}
                  className={cn(
                    "w-full px-3 py-2 border border-input rounded-[3px] text-sm text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used in issue keys (e.g. MC-123). Auto-generated from name.
                </p>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                  Description <span className="normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief project description"
                  rows={3}
                  className={cn(
                    "w-full px-3 py-2 border border-input rounded-[3px] text-sm text-foreground resize-none",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  )}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-[3px]",
                    "hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
                  )}
                >
                  {submitting ? "Creating..." : "Create"}
                </button>
                <Link
                  href={`/${workspace.slug}`}
                  className={cn(
                    "px-4 py-2.5 bg-secondary text-secondary-foreground text-sm font-medium rounded-[3px]",
                    "hover:bg-border transition-colors"
                  )}
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
