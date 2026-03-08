"use client";

import { signOut, useSession } from "next-auth/react";
import { Search, Plus, LogOut, User } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { useState, useRef, useEffect } from "react";

export const Topbar = () => {
  const { data: session } = useSession();
  const { setCreateIssueOpen, setCommandPaletteOpen, currentUserWorkspaceRole } = useUIStore();
  const isViewer = currentUserWorkspaceRole === "viewer";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        if (!isViewer) setCreateIssueOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setCommandPaletteOpen, setCreateIssueOpen, isViewer]);

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "U";

  return (
    <header className="h-14 bg-white border-b border-border flex items-center justify-between px-4 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-[3px] text-sm text-muted-foreground hover:bg-border transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white rounded text-[10px] font-mono border border-border">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {!isViewer && (
          <button
            onClick={() => setCreateIssueOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-[3px] hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        )}

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity"
          >
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              initials
            )}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-md shadow-lg border border-border py-1 z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium text-foreground">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
              </div>
              <button
                onClick={() => {}}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
