"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  FolderKanban,
  ListTodo,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Layers,
  Timer,
  Home,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useUIStore } from "@/store/uiStore";
import { useShallow } from "zustand/react/shallow";

export const Sidebar = () => {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, workspace, projects, currentProject, currentUserWorkspaceRole } = useUIStore(
    useShallow((s) => ({
      sidebarCollapsed: s.sidebarCollapsed,
      toggleSidebar: s.toggleSidebar,
      workspace: s.sidebarData.workspace,
      projects: s.sidebarData.projects,
      currentProject: s.sidebarData.currentProject,
      currentUserWorkspaceRole: s.currentUserWorkspaceRole,
    }))
  );
  const isViewer = currentUserWorkspaceRole === "viewer";

  const projectNav = currentProject && workspace
    ? [
        { label: "Board",    href: `/${workspace.slug}/projects/${currentProject._id}/board`,    icon: FolderKanban },
        { label: "Backlog",  href: `/${workspace.slug}/projects/${currentProject._id}/backlog`,  icon: ListTodo },
        { label: "Sprints",  href: `/${workspace.slug}/projects/${currentProject._id}/sprints`,  icon: Timer },
        { label: "Reports",  href: `/${workspace.slug}/projects/${currentProject._id}/reports`,  icon: BarChart3 },
        { label: "Settings", href: `/${workspace.slug}/projects/${currentProject._id}/settings`, icon: Settings },
      ]
    : [];

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar-bg text-sidebar-text flex flex-col transition-all duration-200 fixed left-0 top-0 z-30",
        sidebarCollapsed ? "w-16" : "w-[240px]"
      )}
    >
      {/* Logo + collapse toggle */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 shrink-0">
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-white" />
            <span className="font-bold text-white text-lg">Dentobees Jira</span>
          </Link>
        )}
        {sidebarCollapsed && (
          <Link href="/dashboard" className="mx-auto">
            <LayoutGrid className="w-6 h-6 text-white" />
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            "p-1.5 rounded hover:bg-sidebar-hover transition-colors text-sidebar-text cursor-pointer shrink-0",
            sidebarCollapsed && "mx-auto"
          )}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Scrollable nav */}
      <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-1">

        {/* Dashboard link */}
        {!sidebarCollapsed ? (
          <div className="px-3 mb-1">
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                pathname === "/dashboard" ? "bg-sidebar-hover text-white font-medium" : "hover:bg-sidebar-hover"
              )}
            >
              <Home className="w-4 h-4 shrink-0" />
              Dashboard
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 px-2">
            <Link href="/dashboard" className={cn("p-2 rounded transition-colors w-full flex justify-center", pathname === "/dashboard" ? "bg-sidebar-hover text-white" : "hover:bg-sidebar-hover")} title="Dashboard">
              <Home className="w-5 h-5" />
            </Link>
          </div>
        )}

        {/* Workspace section */}
        {workspace && !sidebarCollapsed && (
          <div className="px-3 mt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 px-2 mb-1">Workspace</p>
            <Link
              href={`/${workspace.slug}`}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                pathname === `/${workspace.slug}` ? "bg-sidebar-hover text-white font-medium" : "hover:bg-sidebar-hover"
              )}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span className="truncate">{workspace.name}</span>
            </Link>
          </div>
        )}

        {/* Projects list */}
        {workspace && !sidebarCollapsed && (
          <div className="px-3 mt-3">
            <div className="flex items-center justify-between px-2 mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Projects</p>
              {!isViewer && (
                <Link
                  href={`/${workspace.slug}/projects/new`}
                  className="p-0.5 rounded hover:bg-sidebar-hover transition-colors"
                  title="New project"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
            {projects?.map((project) => (
              <Link
                key={project._id}
                href={`/${workspace.slug}/projects/${project._id}/board`}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors mb-0.5",
                  currentProject?._id === project._id
                    ? "bg-sidebar-hover text-white font-medium"
                    : "hover:bg-sidebar-hover"
                )}
              >
                <span className="w-5 h-5 rounded bg-white/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {project.key.slice(0, 2)}
                </span>
                <span className="truncate">{project.name}</span>
              </Link>
            ))}
            {(!projects || projects.length === 0) && (
              <p className="px-2 py-1 text-xs text-white/40">No projects yet</p>
            )}
          </div>
        )}

        {/* Current project nav */}
        {currentProject && !sidebarCollapsed && (
          <div className="px-3 mt-3 border-t border-white/10 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 px-2 mb-1 truncate">
              {currentProject.name}
            </p>
            {projectNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors mb-0.5",
                  pathname === item.href
                    ? "bg-sidebar-hover text-white font-medium"
                    : "hover:bg-sidebar-hover"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>
        )}

        {/* Collapsed icon strip */}
        {sidebarCollapsed && (
          <div className="flex flex-col items-center gap-1 px-2 mt-1">
            {workspace && (
              <Link href={`/${workspace.slug}`} className={cn("p-2 rounded transition-colors w-full flex justify-center", pathname === `/${workspace.slug}` ? "bg-sidebar-hover text-white" : "hover:bg-sidebar-hover")} title={workspace.name}>
                <Layers className="w-5 h-5" />
              </Link>
            )}
            {projectNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "p-2 rounded transition-colors w-full flex justify-center",
                  pathname === item.href ? "bg-sidebar-hover text-white" : "hover:bg-sidebar-hover"
                )}
                title={item.label}
              >
                <item.icon className="w-5 h-5" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Bottom settings — always visible */}
      <div className="shrink-0 border-t border-white/10 py-2 px-3">
        {!sidebarCollapsed ? (
          <>
            {workspace && (
              <Link
                href={`/${workspace.slug}/settings`}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                  pathname === `/${workspace.slug}/settings` ? "bg-sidebar-hover text-white font-medium" : "hover:bg-sidebar-hover"
                )}
              >
                <Settings className="w-4 h-4 shrink-0" />
                Workspace Settings
              </Link>
            )}
            {!workspace && (
              <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-sidebar-hover transition-colors">
                <Settings className="w-4 h-4 shrink-0" />
                Settings
              </Link>
            )}
          </>
        ) : (
          <div className="flex justify-center">
            <Link
              href={workspace ? `/${workspace.slug}/settings` : "/dashboard"}
              className="p-2 rounded hover:bg-sidebar-hover transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
};
