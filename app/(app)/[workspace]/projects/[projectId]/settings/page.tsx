"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2, Plus, ChevronUp, ChevronDown, UserMinus, UserPlus } from "lucide-react";
import { useSidebarData } from "@/hooks/useSidebarData";
import { useWorkspaceRole } from "@/hooks/useWorkspaceRole";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/cn";
import type { IWorkspace, IProject, BoardColumn } from "@/types";
import toast from "react-hot-toast";

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

function UserAvatar({ user }: { user: PopulatedUser }) {
  const initials = user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.image} alt={user.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
    );
  }
  return (
    <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-medium flex items-center justify-center shrink-0">
      {initials}
    </span>
  );
}

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspace as string;
  const projectId = params.projectId as string;

  const [workspace, setWorkspace] = useState<IWorkspace | null>(null);
  const [project, setProject] = useState<IProject | null>(null);
  const [projects, setProjects] = useState<{ _id: string; name: string; key: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [generalForm, setGeneralForm] = useState({
    name: "",
    key: "",
    description: "",
  });
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [projectMembers, setProjectMembers] = useState<PopulatedUser[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<PopulatedUser[]>([]);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberActionId, setMemberActionId] = useState<string | null>(null);

  const isViewer = useUIStore((s) => s.currentUserWorkspaceRole === "viewer");

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
      setGeneralForm({
        name: projData.name,
        key: projData.key,
        description: projData.description ?? "",
      });
      setColumns(projData.columns ?? []);

      // Populate project members (already populated from API)
      const pm: PopulatedUser[] = (projData.members ?? []).filter(
        (m: unknown): m is PopulatedUser => typeof m === "object" && m !== null && "_id" in m
      );
      setProjectMembers(pm);

      // Workspace members for the "Add Member" picker
      const wm: PopulatedUser[] = (fullWorkspace.members ?? [])
        .map((m: { user?: PopulatedUser | string }) => m.user)
        .filter((u: unknown): u is PopulatedUser => typeof u === "object" && u !== null && "_id" in u);
      setWorkspaceMembers(wm);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: generalForm.name.trim(),
          key: generalForm.key.trim(),
          description: generalForm.description.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to update");
      }
      toast.success("Project updated");
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveColumns = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columns: columns.map((c, i) => ({ ...c, order: i })),
        }),
      });
      if (!res.ok) throw new Error("Failed to update columns");
      toast.success("Columns updated");
      fetchData();
    } catch {
      toast.error("Failed to update columns");
    } finally {
      setSaving(false);
    }
  };

  const addColumn = () => {
    const id = `col-${Date.now()}`;
    setColumns((prev) => [
      ...prev,
      { id, name: "New Column", color: "#dfe1e6", order: prev.length },
    ]);
  };

  const removeColumn = (id: string) => {
    if (columns.length <= 1) {
      toast.error("At least one column is required");
      return;
    }
    setColumns((prev) => prev.filter((c) => c.id !== id));
  };

  const updateColumn = (id: string, updates: Partial<BoardColumn>) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const moveColumn = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;
    setColumns((prev) => {
      const arr = [...prev];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr;
    });
  };

  const handleAddMember = async (userId: string) => {
    setMemberActionId(userId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addMember: userId }),
      });
      if (!res.ok) throw new Error("Failed to add member");
      toast.success("Member added");
      setAddMemberOpen(false);
      fetchData();
    } catch {
      toast.error("Failed to add member");
    } finally {
      setMemberActionId(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setMemberActionId(userId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeMember: userId }),
      });
      if (!res.ok) throw new Error("Failed to remove member");
      toast.success("Member removed");
      fetchData();
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setMemberActionId(null);
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirm !== project?.name) {
      toast.error("Type the project name to confirm");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Project deleted");
      router.push(`/${workspaceSlug}`);
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setDeleting(false);
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
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Project Settings</h1>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
            {project.name}
          </p>
        </div>

        <div className="space-y-8 max-w-2xl">
          {isViewer && (
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-[3px] text-sm text-amber-800">
              You have view-only access to this workspace. Settings cannot be modified.
            </div>
          )}

          <section className="bg-white border border-border rounded-[3px] p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">General</h2>
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Name</label>
                <input
                  type="text"
                  value={generalForm.name}
                  onChange={(e) => setGeneralForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Key</label>
                <input
                  type="text"
                  value={generalForm.key}
                  onChange={(e) => setGeneralForm((f) => ({ ...f, key: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">Used for issue keys (e.g. {generalForm.key || "KEY"}-1)</p>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Description</label>
                <textarea
                  value={generalForm.description}
                  onChange={(e) => setGeneralForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              {!isViewer && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-[3px] hover:bg-primary-hover disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              )}
            </form>
          </section>

          <section className="bg-white border border-border rounded-[3px] p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Board Columns</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Configure the columns for your Kanban board. Use arrows to reorder.
            </p>
            <div className="space-y-2 mb-4">
              {columns.map((col, idx) => (
                <div
                  key={col.id}
                  className="flex items-center gap-3 p-3 border border-border rounded-[3px] bg-secondary/20"
                >
                  <div className="flex flex-col shrink-0">
                    <button
                      type="button"
                      onClick={() => moveColumn(idx, "up")}
                      disabled={idx === 0}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveColumn(idx, "down")}
                      disabled={idx === columns.length - 1}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: col.color }}
                  />
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) => updateColumn(col.id, { name: e.target.value })}
                    className="flex-1 px-2 py-1 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="color"
                    value={col.color}
                    onChange={(e) => updateColumn(col.id, { color: e.target.value })}
                    className="w-8 h-8 rounded border border-border cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => removeColumn(col.id)}
                    disabled={columns.length <= 1}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary rounded-[3px] disabled:opacity-50 disabled:hover:text-muted-foreground"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {!isViewer && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addColumn}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-[3px]"
                >
                  <Plus className="w-4 h-4" />
                  Add Column
                </button>
                <button
                  type="button"
                  onClick={handleSaveColumns}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-[3px] hover:bg-primary-hover disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Columns"}
                </button>
              </div>
            )}
          </section>

          {/* Members section */}
          <section className="bg-white border border-border rounded-[3px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Members</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Project members can be assigned to issues.
                </p>
              </div>
              {!isViewer && (
                <button
                  type="button"
                  onClick={() => setAddMemberOpen((o) => !o)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-[3px] hover:bg-primary-hover transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Member
                </button>
              )}
            </div>

            {/* Add member picker */}
            {addMemberOpen && (
              <div className="mb-4 p-3 border border-border rounded-[3px] bg-secondary/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Select from workspace members
                </p>
                {workspaceMembers.filter((wm) => !projectMembers.some((pm) => pm._id === wm._id)).length === 0 ? (
                  <p className="text-sm text-muted-foreground">All workspace members are already in this project.</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {workspaceMembers
                      .filter((wm) => !projectMembers.some((pm) => pm._id === wm._id))
                      .map((user) => (
                        <button
                          key={user._id}
                          type="button"
                          onClick={() => handleAddMember(user._id)}
                          disabled={memberActionId === user._id}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-[3px] hover:bg-white transition-colors disabled:opacity-50"
                        >
                          <UserAvatar user={user} />
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-foreground truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                          <Plus className="w-4 h-4 text-primary shrink-0" />
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Current members list */}
            {projectMembers.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-border rounded-[3px]">
                <p className="text-sm text-muted-foreground">No members yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Add workspace members above to assign them to issues.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {projectMembers.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center gap-3 px-3 py-2.5 border border-border rounded-[3px] bg-secondary/10"
                  >
                    <UserAvatar user={member} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    {!isViewer && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member._id)}
                        disabled={memberActionId === member._id}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary rounded-[3px] transition-colors disabled:opacity-50"
                        title="Remove from project"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {!isViewer && (
            <section className="bg-white border border-border rounded-[3px] p-6 border-destructive/30">
              <h2 className="text-sm font-semibold text-destructive mb-4">Danger Zone</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Deleting this project will remove all issues, sprints, and related data. This cannot be undone.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={`Type "${project.name}" to confirm`}
                  className="px-3 py-2 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring w-64"
                />
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  disabled={deleting || deleteConfirm !== project.name}
                  className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-[3px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? "Deleting..." : "Delete Project"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
