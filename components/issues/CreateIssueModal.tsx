"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronDown, Check } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/cn";
import type { IssueType, IssuePriority } from "@/types";
import toast from "react-hot-toast";

const ISSUE_TYPES: IssueType[] = ["bug", "story", "task", "epic"];
const PRIORITIES: IssuePriority[] = ["urgent", "high", "medium", "low", "none"];

interface Member {
  _id: string;
  name: string;
  email: string;
  image?: string;
}

interface CreateIssueModalProps {
  projectId: string;
  onCreated: () => void;
}

function MemberAvatar({ member, size = "sm" }: { member: Member; size?: "sm" | "xs" }) {
  const sizeClass = size === "xs" ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]";
  const initials = member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (member.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={member.image} alt={member.name} className={cn("rounded-full object-cover", sizeClass)} title={member.name} />
    );
  }
  return (
    <span className={cn("rounded-full bg-primary/20 text-primary font-medium flex items-center justify-center shrink-0", sizeClass)}>
      {initials}
    </span>
  );
}

function AssigneeDropdown({
  members,
  selected,
  onChange,
}: {
  members: Member[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const selectedMembers = members.filter((m) => selected.includes(m._id));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-[3px] bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring hover:bg-secondary/30 transition-colors"
      >
        {selectedMembers.length === 0 ? (
          <span className="text-muted-foreground flex-1 text-left">Unassigned</span>
        ) : (
          <div className="flex items-center gap-1.5 flex-1 flex-wrap">
            {selectedMembers.map((m) => (
              <span key={m._id} className="flex items-center gap-1 bg-secondary px-1.5 py-0.5 rounded text-xs">
                <MemberAvatar member={m} size="xs" />
                {m.name.split(" ")[0]}
              </span>
            ))}
          </div>
        )}
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-[3px] shadow-lg max-h-48 overflow-y-auto">
          {members.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              No members in this project yet.
            </div>
          ) : (
            members.map((member) => {
              const isSelected = selected.includes(member._id);
              return (
                <button
                  key={member._id}
                  type="button"
                  onClick={() => toggle(member._id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                >
                  <MemberAvatar member={member} />
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
  );
}

export function CreateIssueModal({ projectId, onCreated }: CreateIssueModalProps) {
  const { createIssueOpen, setCreateIssueOpen } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [sprints, setSprints] = useState<{ _id: string; name: string }[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [form, setForm] = useState({
    title: "",
    type: "task" as IssueType,
    priority: "medium" as IssuePriority,
    assignees: [] as string[],
    storyPoints: "",
    description: "",
    sprint: "",
    dueDate: "",
  });

  const fetchModalData = useCallback(async () => {
    try {
      const [sprintsRes, projectRes] = await Promise.all([
        fetch(`/api/sprints?projectId=${projectId}`),
        fetch(`/api/projects/${projectId}`),
      ]);
      if (sprintsRes.ok) setSprints(await sprintsRes.json());
      if (projectRes.ok) {
        const project = await projectRes.json();
        // members is populated array of users
        const projectMembers: Member[] = (project.members ?? []).filter(
          (m: unknown): m is Member => typeof m === "object" && m !== null && "_id" in m
        );
        setMembers(projectMembers);
      }
    } catch {
      // ignore
    }
  }, [projectId]);

  useEffect(() => {
    if (createIssueOpen && projectId) fetchModalData();
  }, [createIssueOpen, projectId, fetchModalData]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCreateIssueOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [setCreateIssueOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }

    setLoading(true);
    try {
      let uploadedAttachments: { filename: string; url: string; size: number }[] = [];

      if (attachments.length > 0) {
        const fd = new FormData();
        attachments.forEach((file) => fd.append("files", file));

        const uploadRes = await fetch("/api/uploads", {
          method: "POST",
          body: fd,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to upload attachments");
        }

        uploadedAttachments = await uploadRes.json();
      }

      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          type: form.type,
          priority: form.priority,
          projectId,
          assignees: form.assignees,
          storyPoints: form.storyPoints ? Number(form.storyPoints) : 0,
          description: form.description.trim() || undefined,
          sprint: form.sprint || null,
          dueDate: form.dueDate || null,
          attachments: uploadedAttachments,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create issue");
      }

      toast.success("Issue created");
      setForm({ title: "", type: "task", priority: "medium", assignees: [], storyPoints: "", description: "", sprint: "", dueDate: "" });
      setAttachments([]);
      setCreateIssueOpen(false);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create issue");
    } finally {
      setLoading(false);
    }
  };

  if (!createIssueOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) setCreateIssueOpen(false); }}
    >
      <div
        className="bg-white border border-border shadow-lg rounded-[3px] max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Create issue</h2>
          <button
            type="button"
            onClick={() => setCreateIssueOpen(false)}
            className="p-1 rounded-[3px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Issue title"
              className="w-full px-3 py-2 text-sm border border-input rounded-[3px] bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
              autoFocus
            />
          </div>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as IssueType }))}
                className="w-full px-3 py-2 text-sm border border-input rounded-[3px] bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ISSUE_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as IssuePriority }))}
                className="w-full px-3 py-2 text-sm border border-input rounded-[3px] bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Assignees</label>
            <AssigneeDropdown
              members={members}
              selected={form.assignees}
              onChange={(ids) => setForm((f) => ({ ...f, assignees: ids }))}
            />
            {members.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Add members to this project in Project Settings to enable assignment.
              </p>
            )}
          </div>

          {/* Story Points + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Story Points</label>
              <input
                type="number"
                min={0}
                value={form.storyPoints}
                onChange={(e) => setForm((f) => ({ ...f, storyPoints: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-input rounded-[3px] bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-input rounded-[3px] bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Sprint */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Sprint</label>
            <select
              value={form.sprint}
              onChange={(e) => setForm((f) => ({ ...f, sprint: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-input rounded-[3px] bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">None (Backlog)</option>
              {sprints.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Add a description..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-input rounded-[3px] bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Attachments</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                setAttachments(files);
              }}
              className="block w-full text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-[3px] file:border-0 file:bg-secondary file:text-foreground hover:file:bg-secondary/80 cursor-pointer"
            />
            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {attachments.map((file) => (
                  <li key={file.name} className="truncate">
                    {file.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setCreateIssueOpen(false)}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-[3px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-[3px] hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
