"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { X, MessageSquare, Activity as ActivityIcon, ChevronDown, Check, UserPlus } from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  IIssue,
  IComment,
  IProject,
  IUser,
  IssueType,
  IssuePriority,
  BoardColumn,
} from "@/types";
import { IssuePriorityBadge } from "./IssuePriorityBadge";
import { IssueTypeBadge } from "./IssueTypeBadge";
import toast from "react-hot-toast";
import { format, formatDistanceToNow } from "date-fns";

interface IActivity {
  _id: string;
  actor: IUser | string;
  action: string;
  from?: string;
  to?: string;
  createdAt: string;
}

const ISSUE_TYPES: IssueType[] = ["bug", "story", "task", "epic", "subtask"];
const PRIORITIES: IssuePriority[] = ["urgent", "high", "medium", "low", "none"];

interface IssueDetailModalProps {
  issueId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

function InlineField<T>({
  value,
  onSave,
  renderView,
  renderEdit,
  label,
}: {
  value: T;
  onSave: (v: T) => void;
  renderView: (v: T) => React.ReactNode;
  renderEdit: (v: T, onChange: (v: T) => void, onBlur: () => void) => React.ReactNode;
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = () => {
    if (draft !== value) {
      onSave(draft);
    }
    setEditing(false);
  };

  return (
    <div className="group">
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      {editing ? (
        <div onClick={(e) => e.stopPropagation()}>
          {renderEdit(draft, setDraft, handleSave)}
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="min-h-[24px] py-0.5 px-1 -mx-1 rounded-[3px] hover:bg-secondary cursor-pointer"
        >
          {renderView(value)}
        </div>
      )}
    </div>
  );
}

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

export function IssueDetailModal({
  issueId,
  onClose,
  onUpdated,
}: IssueDetailModalProps) {
  const [issue, setIssue] = useState<IIssue | null>(null);
  const [project, setProject] = useState<IProject | null>(null);
  const [projectMembers, setProjectMembers] = useState<IUser[]>([]);
  const [comments, setComments] = useState<IComment[]>([]);
  const [activities, setActivities] = useState<IActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const fetchIssue = useCallback(async () => {
    if (!issueId) return;
    try {
      const res = await fetch(`/api/issues/${issueId}`);
      if (res.ok) {
        const data = await res.json();
        setIssue(data);
        const projectId = typeof data.project === "string" ? data.project : data.project?._id;
        if (projectId) {
          const pRes = await fetch(`/api/projects/${projectId}`);
          if (pRes.ok) {
            const pData = await pRes.json();
            setProject(pData);
            const members = (pData.members ?? []).filter(
              (m: unknown): m is IUser => typeof m === "object" && m !== null && "_id" in m
            );
            setProjectMembers(members);
          }
        }
      }
    } catch {
      toast.error("Failed to load issue");
    }
  }, [issueId]);

  const fetchComments = useCallback(async () => {
    if (!issueId) return;
    try {
      const res = await fetch(`/api/issues/${issueId}/comments`);
      if (res.ok) setComments(await res.json());
    } catch { /* ignore */ }
  }, [issueId]);

  const fetchActivity = useCallback(async () => {
    if (!issueId) return;
    try {
      const res = await fetch(`/api/issues/${issueId}/activity`);
      if (res.ok) setActivities(await res.json());
    } catch { /* ignore */ }
  }, [issueId]);

  useEffect(() => {
    if (issueId) {
      setLoading(true);
      fetchIssue().finally(() => setLoading(false));
      fetchComments();
      fetchActivity();
    } else {
      setIssue(null);
      setProject(null);
      setProjectMembers([]);
      setComments([]);
      setActivities([]);
      setAssigneeDropdownOpen(false);
    }
  }, [issueId, fetchIssue, fetchComments, fetchActivity]);

  // Close assignee dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(e.target as Node)) {
        setAssigneeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const patchIssue = async (updates: Record<string, unknown>) => {
    if (!issueId) return;
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
      const data = await res.json();
      setIssue(data);
      onUpdated();
      fetchActivity();
      toast.success("Updated");
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueId || !commentBody.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/issues/${issueId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      setCommentBody("");
      await fetchComments();
      toast.success("Comment added");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!issueId) return null;

  const columns: BoardColumn[] = project?.columns ?? [];
  const reporter = issue?.reporter as IUser | undefined;
  const assignees = (issue?.assignees ?? []) as (string | IUser)[];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleOverlayClick}
    >
      <div
        className={cn(
          "bg-white border border-border shadow-lg rounded-[3px] max-w-4xl w-full mx-4",
          "max-h-[90vh] overflow-hidden flex flex-col"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-foreground">
            {loading ? "Loading..." : issue?.key ?? "Issue"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[3px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : issue ? (
            <div className="flex">
              {/* Main content */}
              <div className="flex-1 min-w-0 p-4 border-r border-border">
                <InlineField
                  label="Title"
                  value={issue.title}
                  onSave={(v) => patchIssue({ title: v })}
                  renderView={(v) => (
                    <span className="text-base font-medium text-foreground">
                      {v || "—"}
                    </span>
                  )}
                  renderEdit={(v, onChange, onBlur) => (
                    <input
                      type="text"
                      value={v}
                      onChange={(e) => onChange(e.target.value)}
                      onBlur={onBlur}
                      onKeyDown={(e) => e.key === "Enter" && onBlur()}
                      autoFocus
                      className="w-full px-2 py-1 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  )}
                />

                <div className="mt-4">
                  <InlineField
                    label="Description"
                    value={issue.description}
                    onSave={(v) => patchIssue({ description: v })}
                    renderView={(v) => (
                      <span className="text-sm text-foreground whitespace-pre-wrap">
                        {v || "Add a description..."}
                      </span>
                    )}
                    renderEdit={(v, onChange, onBlur) => (
                      <textarea
                        value={v}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={onBlur}
                        rows={4}
                        autoFocus
                        className="w-full px-2 py-1 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                    )}
                  />
                </div>

                {/* Comments */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                    <MessageSquare className="size-4" />
                    Comments ({comments.length})
                  </h3>
                  <form onSubmit={handleAddComment} className="mb-4">
                    <textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-input rounded-[3px] bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !commentBody.trim()}
                      className="mt-2 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-[3px] hover:bg-primary-hover disabled:opacity-50"
                    >
                      {submittingComment ? "Adding..." : "Add comment"}
                    </button>
                  </form>
                  <div className="space-y-3">
                    {comments.map((c) => {
                      const author = c.author as IUser;
                      return (
                        <div
                          key={c._id}
                          className="p-3 bg-secondary/50 rounded-[3px] border border-border"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <UserAvatar user={author} />
                            <span className="text-sm font-medium text-foreground">
                              {author?.name ?? "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(c.createdAt), "MMM d, yyyy HH:mm")}
                            </span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {c.body}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Activity */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
                    <ActivityIcon className="size-4" />
                    Activity
                  </h3>
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  ) : (
                    <div className="space-y-0">
                      {activities.map((act, idx) => {
                        const actor = act.actor as IUser;
                        const initials = actor?.name
                          ? actor.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                          : "?";
                        return (
                          <div key={act._id} className={cn("flex gap-3 py-2", idx < activities.length - 1 && "border-b border-border")}>
                            {/* Actor avatar */}
                            <div className="shrink-0 mt-0.5">
                              {actor?.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={actor.image} alt={actor.name} className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[9px] font-medium flex items-center justify-center">
                                  {initials}
                                </span>
                              )}
                            </div>
                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">
                                <span className="font-medium">{actor?.name ?? "Someone"}</span>
                                {" "}{act.action}
                                {act.from && act.to && (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    <span className="line-through text-xs">{act.from}</span>
                                    {" → "}
                                    <span className="font-medium text-foreground">{act.to}</span>
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata sidebar */}
              <div className="w-64 shrink-0 p-4 space-y-4">
                <InlineField
                  label="Status"
                  value={issue.status}
                  onSave={(v) => patchIssue({ status: v })}
                  renderView={(v) => (
                    <span className="text-sm text-foreground">{v ?? "—"}</span>
                  )}
                  renderEdit={(v, onChange, onBlur) => (
                    <select
                      value={v}
                      onChange={(e) => onChange(e.target.value)}
                      onBlur={onBlur}
                      autoFocus
                      className="w-full px-2 py-1 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {columns.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.name}
                        </option>
                      ))}
                    </select>
                  )}
                />

                <InlineField
                  label="Priority"
                  value={issue.priority}
                  onSave={(v) => patchIssue({ priority: v })}
                  renderView={(v) => <IssuePriorityBadge priority={v} />}
                  renderEdit={(v, onChange, onBlur) => (
                    <select
                      value={v}
                      onChange={(e) => onChange(e.target.value as IssuePriority)}
                      onBlur={onBlur}
                      autoFocus
                      className="w-full px-2 py-1 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                  )}
                />

                <InlineField
                  label="Type"
                  value={issue.type}
                  onSave={(v) => patchIssue({ type: v })}
                  renderView={(v) => <IssueTypeBadge type={v} />}
                  renderEdit={(v, onChange, onBlur) => (
                    <select
                      value={v}
                      onChange={(e) => onChange(e.target.value as IssueType)}
                      onBlur={onBlur}
                      autoFocus
                      className="w-full px-2 py-1 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {ISSUE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </select>
                  )}
                />

                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">
                    Reporter
                  </div>
                  <div className="flex items-center gap-2 py-0.5">
                    {reporter ? (
                      <>
                        <UserAvatar user={reporter} />
                        <span className="text-sm text-foreground">
                          {reporter.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </div>
                </div>

                {/* Assignees — interactive dropdown */}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Assignees</div>
                  <div ref={assigneeDropdownRef} className="relative">
                    {/* Trigger */}
                    <button
                      type="button"
                      onClick={() => setAssigneeDropdownOpen((o) => !o)}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 -mx-2 rounded-[3px] hover:bg-secondary transition-colors text-left"
                    >
                      {assignees.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                          {assignees.map((a) => {
                            if (typeof a === "string") return null;
                            return (
                              <span key={a._id} className="flex items-center gap-1 text-sm text-foreground">
                                <UserAvatar user={a} />
                                <span className="truncate max-w-[80px]">{a.name.split(" ")[0]}</span>
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground flex-1">
                          <UserPlus className="w-3.5 h-3.5" />
                          Unassigned
                        </span>
                      )}
                      <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", assigneeDropdownOpen && "rotate-180")} />
                    </button>

                    {/* Dropdown */}
                    {assigneeDropdownOpen && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-[3px] shadow-lg max-h-48 overflow-y-auto">
                        {projectMembers.length === 0 ? (
                          <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                            No members in this project.<br />Add members in Project Settings.
                          </div>
                        ) : (
                          projectMembers.map((member) => {
                            const currentIds = assignees
                              .map((a) => typeof a === "string" ? a : a._id)
                              .filter(Boolean);
                            const isSelected = currentIds.includes(member._id);
                            return (
                              <button
                                key={member._id}
                                type="button"
                                onClick={() => {
                                  const newIds = isSelected
                                    ? currentIds.filter((id) => id !== member._id)
                                    : [...currentIds, member._id];
                                  patchIssue({ assignees: newIds });
                                  setAssigneeDropdownOpen(false);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                              >
                                <UserAvatar user={member} />
                                <div className="flex-1 text-left min-w-0">
                                  <p className="text-foreground truncate">{member.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <InlineField
                  label="Story Points"
                  value={issue.storyPoints}
                  onSave={(v) => patchIssue({ storyPoints: v })}
                  renderView={(v) => (
                    <span className="text-sm text-foreground">
                      {v ?? 0}
                    </span>
                  )}
                  renderEdit={(v, onChange, onBlur) => (
                    <input
                      type="number"
                      min={0}
                      value={v}
                      onChange={(e) => onChange(Number(e.target.value) || 0)}
                      onBlur={onBlur}
                      onKeyDown={(e) => e.key === "Enter" && onBlur()}
                      autoFocus
                      className="w-full px-2 py-1 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  )}
                />

                <InlineField
                  label="Due Date"
                  value={
                    issue.dueDate
                      ? format(new Date(issue.dueDate), "yyyy-MM-dd")
                      : ""
                  }
                  onSave={(v) =>
                    patchIssue({ dueDate: v ? new Date(v).toISOString() : null })
                  }
                  renderView={(v) => (
                    <span className="text-sm text-foreground">
                      {v || "—"}
                    </span>
                  )}
                  renderEdit={(v, onChange, onBlur) => (
                    <input
                      type="date"
                      value={v}
                      onChange={(e) => onChange(e.target.value)}
                      onBlur={onBlur}
                      autoFocus
                      className="w-full px-2 py-1 text-sm border border-input rounded-[3px] focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  )}
                />

                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">
                    Sprint
                  </div>
                  <div className="text-sm text-foreground py-0.5">
                    {issue.sprint && typeof issue.sprint === "object"
                      ? (issue.sprint as { name?: string }).name
                      : issue.sprint
                        ? String(issue.sprint)
                        : "—"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Issue not found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
