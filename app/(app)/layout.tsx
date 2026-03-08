"use client";

import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/cn";
import { Topbar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen">
      {/* Sidebar lives here — never unmounts on navigation */}
      <Sidebar />
      <div className={cn("transition-all duration-200", sidebarCollapsed ? "pl-16" : "pl-[240px]")}>
        <Topbar />
        <main className="p-6">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
