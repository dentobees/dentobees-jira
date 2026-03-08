"use client";

import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FolderKanban, FileText, Hash } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

interface SearchResult {
  id: string;
  type: "project" | "issue";
  title: string;
  subtitle: string;
  href: string;
}

export const CommandPalette = () => {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const wsRes = await fetch("/api/workspaces");
        const workspaces = await wsRes.json();

        const items: SearchResult[] = [];

        for (const ws of workspaces) {
          const projRes = await fetch(`/api/projects?workspaceId=${ws._id}`);
          const projects = await projRes.json();

          for (const project of projects) {
            if (project.name.toLowerCase().includes(query.toLowerCase())) {
              items.push({
                id: project._id,
                type: "project",
                title: project.name,
                subtitle: `${project.key} · ${ws.name}`,
                href: `/${ws.slug}/projects/${project._id}/board`,
              });
            }

            const issueRes = await fetch(`/api/issues?projectId=${project._id}&search=${encodeURIComponent(query)}`);
            const issues = await issueRes.json();

            for (const issue of issues.slice(0, 5)) {
              items.push({
                id: issue._id,
                type: "issue",
                title: issue.title,
                subtitle: `${issue.key} · ${project.name}`,
                href: `/${ws.slug}/projects/${project._id}/board`,
              });
            }
          }
        }

        setResults(items.slice(0, 10));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (href: string) => {
    setCommandPaletteOpen(false);
    setQuery("");
    router.push(href);
  };

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          setCommandPaletteOpen(false);
          setQuery("");
        }}
      />
      <div className="relative max-w-lg mx-auto mt-[20vh]">
        <Command
          className="bg-white rounded-lg shadow-2xl border border-border overflow-hidden"
          shouldFilter={false}
        >
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search issues, projects..."
              className="w-full py-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono text-muted-foreground border border-border">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            {loading && (
              <Command.Loading>
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">Searching...</div>
              </Command.Loading>
            )}

            {!loading && query && results.length === 0 && (
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                No results found.
              </Command.Empty>
            )}

            {!query && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Start typing to search...
              </div>
            )}

            {results.map((result) => (
              <Command.Item
                key={result.id}
                value={result.id}
                onSelect={() => handleSelect(result.href)}
                className="flex items-center gap-3 px-3 py-2 rounded-[3px] cursor-pointer text-sm hover:bg-secondary data-[selected=true]:bg-secondary transition-colors"
              >
                {result.type === "project" ? (
                  <FolderKanban className="w-4 h-4 text-primary shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-foreground truncate">{result.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {result.subtitle}
                  </div>
                </div>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
