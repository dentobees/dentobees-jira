"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import toast from "react-hot-toast";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create workspace");
        return;
      }

      const workspace = await res.json();
      toast.success("Workspace created!");
      router.push(`/${workspace.slug}`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-lg bg-accent flex items-center justify-center mx-auto mb-4">
            <LayoutGrid className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Create your workspace</h1>
          <p className="text-muted-foreground text-sm">
            A workspace is where your team collaborates on projects.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-border rounded-md p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-input rounded-[3px] text-sm bg-[#fafbfc] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="My Company"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              URL Slug
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-secondary border border-r-0 border-input rounded-l-[3px] text-sm text-muted-foreground">
                taskflow.app/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                required
                className="flex-1 px-3 py-2 border border-input rounded-r-[3px] text-sm bg-[#fafbfc] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="my-company"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-[3px] hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Creating..." : "Create Workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}
