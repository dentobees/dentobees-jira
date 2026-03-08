import { create } from "zustand";
import type { WorkspaceRole } from "@/types";

interface SidebarWorkspace { _id: string; name: string; slug: string }
interface SidebarProject { _id: string; name: string; key: string }

interface SidebarData {
  workspace?: SidebarWorkspace;
  projects?: SidebarProject[];
  currentProject?: SidebarProject;
}

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  createIssueOpen: boolean;
  setCreateIssueOpen: (open: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  sidebarData: SidebarData;
  setSidebarData: (data: SidebarData) => void;
  currentUserWorkspaceRole: WorkspaceRole | null;
  setCurrentUserWorkspaceRole: (role: WorkspaceRole | null) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  createIssueOpen: false,
  setCreateIssueOpen: (open) => set({ createIssueOpen: open }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  sidebarData: {},
  setSidebarData: (incoming) => {
    const prev = get().sidebarData;

    const nextWorkspace = incoming.workspace ?? prev.workspace;
    const nextProjects = (incoming.projects && incoming.projects.length > 0)
      ? incoming.projects
      : prev.projects;

    // Clear currentProject when:
    // 1. A new workspace is provided (different from previous) — user navigated away
    // 2. A workspace is provided but no project — user is on a workspace-level page
    // Otherwise keep previous currentProject (user is navigating between project tabs)
    let nextProject = prev.currentProject;
    if (incoming.currentProject) {
      nextProject = incoming.currentProject;
    } else if (incoming.workspace && !incoming.currentProject) {
      // Workspace provided but no project → workspace-level page, clear project
      nextProject = undefined;
    }

    // Skip update if nothing changed
    if (
      prev.workspace?._id === nextWorkspace?._id &&
      prev.currentProject?._id === nextProject?._id &&
      prev.projects?.map((p) => p._id).join(",") === nextProjects?.map((p) => p._id).join(",")
    ) {
      return;
    }

    set({ sidebarData: { workspace: nextWorkspace, projects: nextProjects, currentProject: nextProject } });
  },
  currentUserWorkspaceRole: null,
  setCurrentUserWorkspaceRole: (role) => set({ currentUserWorkspaceRole: role }),
}));
