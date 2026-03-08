"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store/uiStore";

interface SidebarWorkspace { _id: string; name: string; slug: string }
interface SidebarProject { _id: string; name: string; key: string }

export const useSidebarData = (
  workspace?: SidebarWorkspace | null,
  projects?: SidebarProject[] | null,
  currentProject?: SidebarProject | null
) => {
  const setSidebarData = useUIStore((state) => state.setSidebarData);

  const workspaceId = workspace?._id;
  const projectsKey = projects?.map((p) => p._id).join(",");
  const currentProjectId = currentProject?._id;

  useEffect(() => {
    setSidebarData({
      workspace: workspace ?? undefined,
      projects: projects ?? undefined,
      currentProject: currentProject ?? undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, projectsKey, currentProjectId]);
};
