"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useSidebarData } from "@/hooks/useSidebarData";
import { cn } from "@/lib/cn";

type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

interface MemberUser {
  _id: string;
  name?: string;
  email?: string;
  image?: string;
}

interface Member {
  user: MemberUser | string;
  role: WorkspaceRole;
}

interface WorkspaceData {
  _id: string;
  name: string;
  slug: string;
  owner: string;
  members: Member[];
  projects: { _id: string; name: string; key: string }[];
}

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const workspaceSlug = params.workspace as string;
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useSidebarData(
    workspace ? { _id: workspace._id, name: workspace.name, slug: workspace.slug } : null,
    workspace?.projects ?? null,
    null
  );

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
        setName(fullWorkspace.name);
        setSlug(fullWorkspace.slug);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspaceSlug]);

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspace._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to update");
        return;
      }
      setWorkspace({ ...workspace, name: data.name, slug: data.slug });
    } catch {
      setSaveError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    setInviting(true);
    setInviteError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspace._id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error ?? "Failed to invite");
        return;
      }
      setInviteEmail("");
      const fullRes = await fetch(`/api/workspaces/${workspace._id}`);
        if (fullRes.ok) {
          const fullWorkspace = await fullRes.json();
          setWorkspace(fullWorkspace);
        }
    } catch {
      setInviteError("Something went wrong");
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async () => {
    if (!workspace || deleteConfirm !== workspace.name) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspace._id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error ?? "Failed to delete");
        return;
      }
      router.push("/dashboard");
    } catch {
      setDeleteError("Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  const getMemberDisplay = (m: Member) => {
    const u = m.user;
    if (typeof u === "object" && u !== null) {
      return u.name || u.email || "Unknown";
    }
    return "Unknown";
  };

  const getMemberEmail = (m: Member) => {
    const u = m.user;
    if (typeof u === "object" && u !== null && "email" in u) {
      return (u as { email?: string }).email;
    }
    return undefined;
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

  if (notFound || !workspace) {
    return (
      <>
        <div className="flex items-center justify-center h-[calc(100vh-56px)]">
          <p className="text-muted-foreground">Workspace not found</p>
        </div>
      </>
    );
  }


  const currentUserId = session?.user?.id;
  const currentMember = workspace.members?.find((m) => {
    const uid = typeof m.user === "object" && m.user !== null ? (m.user as { _id?: string })._id : m.user;
    return uid && String(uid) === currentUserId;
  });
  const canManage = currentMember && (currentMember.role === "owner" || currentMember.role === "admin");
  const isOwner = currentUserId && String(workspace.owner) === currentUserId;

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

        <h1 className="text-xl font-semibold text-foreground mb-6">Workspace settings</h1>

        <div className="space-y-6 max-w-2xl">
          <div className="bg-white border border-border rounded-[3px] p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">General</h2>
            <form onSubmit={handleSaveWorkspace} className="space-y-4">
              {!isOwner && (
                <p className="text-xs text-muted-foreground">Only the workspace owner can edit these settings.</p>
              )}
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                  Workspace name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isOwner}
                  className={cn(
                    "w-full px-3 py-2 border border-input rounded-[3px] text-sm text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                    "disabled:bg-secondary disabled:cursor-not-allowed"
                  )}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                  Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="workspace-url"
                  disabled={!isOwner}
                  className={cn(
                    "w-full px-3 py-2 border border-input rounded-[3px] text-sm text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                    "disabled:bg-secondary disabled:cursor-not-allowed"
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used in URLs: /{slug}
                </p>
              </div>
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
              {isOwner && (
              <button
                type="submit"
                disabled={saving}
                className={cn(
                  "px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-[3px]",
                  "hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
                )}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
              )}
            </form>
          </div>

          <div className="bg-white border border-border rounded-[3px] p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Members</h2>
            <ul className="space-y-2 mb-6">
              {workspace.members?.map((m) => {
                const userId = typeof m.user === "object" && m.user !== null
                  ? (m.user as { _id?: string })._id
                  : m.user;
                return (
                  <li
                    key={String(userId)}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <span className="text-sm font-medium text-foreground">{getMemberDisplay(m)}</span>
                      {getMemberEmail(m) && (
                        <span className="text-xs text-muted-foreground ml-2">{getMemberEmail(m)}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-[3px] font-medium uppercase",
                        m.role === "owner"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-secondary-foreground"
                      )}
                    >
                      {m.role}
                    </span>
                  </li>
                );
              })}
            </ul>

            {canManage && (
            <form onSubmit={handleInvite} className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Invite by email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  className={cn(
                    "w-48 px-3 py-2 border border-input rounded-[3px] text-sm text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  )}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                  className={cn(
                    "px-3 py-2 border border-input rounded-[3px] text-sm text-foreground bg-white",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  )}
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={inviting}
                className={cn(
                  "px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-[3px]",
                  "hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
                )}
              >
                {inviting ? "Inviting..." : "Invite"}
              </button>
            </form>
            )}
            {inviteError && <p className="text-sm text-destructive mt-2">{inviteError}</p>}
          </div>

          {isOwner && (
            <div className="bg-white border border-border rounded-[3px] p-6 border-destructive/50">
              <h2 className="text-sm font-semibold text-destructive mb-2">Danger zone</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Deleting this workspace will remove all projects and issues. This cannot be undone.
              </p>
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Type workspace name to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={workspace.name}
                    className={cn(
                      "w-64 px-3 py-2 border border-input rounded-[3px] text-sm text-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    )}
                  />
                </div>
                <button
                  onClick={handleDelete}
                  disabled={deleting || deleteConfirm !== workspace.name}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2.5 bg-destructive text-destructive-foreground text-sm font-medium rounded-[3px]",
                    "hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? "Deleting..." : "Delete Workspace"}
                </button>
              </div>
              {deleteError && <p className="text-sm text-destructive mt-2">{deleteError}</p>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
