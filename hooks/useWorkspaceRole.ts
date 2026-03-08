"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useUIStore } from "@/store/uiStore";
import type { WorkspaceRole } from "@/types";

interface MemberEntry {
  user: string | { _id?: string };
  role: WorkspaceRole;
}

export const useWorkspaceRole = (members?: MemberEntry[] | null) => {
  const { data: session } = useSession();
  const setCurrentUserWorkspaceRole = useUIStore((s) => s.setCurrentUserWorkspaceRole);
  const userId = session?.user?.id;

  useEffect(() => {
    if (!members || !userId) {
      setCurrentUserWorkspaceRole(null);
      return;
    }
    const entry = members.find((m) => {
      const uid =
        typeof m.user === "object" && m.user !== null
          ? (m.user as { _id?: string })._id
          : m.user;
      return String(uid) === userId;
    });
    setCurrentUserWorkspaceRole(entry?.role ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, userId]);
};
