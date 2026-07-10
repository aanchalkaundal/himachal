"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/lib/store/projectStore";
import { useExportQueue } from "@/lib/export/useExportQueue";
import { useMounted } from "@/hooks/useMounted";
import { Button, Card } from "@/components/ui/primitives";
import { ExportQueue } from "@/components/export/ExportQueue";
import { formatDate } from "@/lib/format";
import { TEMPLATES } from "@/remotion/templates/registry";

type Tab = "create" | "saved" | "queue" | "settings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "create", label: "Create Project", icon: "＋" },
  { id: "saved", label: "Saved Projects", icon: "▤" },
  { id: "queue", label: "Export Queue", icon: "⇩" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export function Dashboard() {
  const router = useRouter();
  const mounted = useMounted();
  const [tab, setTab] = useState<Tab>("create");
  const exportQueue = useExportQueue();

  const saved = useProjectStore((s) => s.saved);
  const newProject = useProjectStore((s) => s.newProject);
  const loadProject = useProjectStore((s) => s.loadProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);

  const activeJobs = exportQueue.jobs.filter((j) =>
    ["waiting", "preparing", "rendering", "encoding"].includes(j.status),
  ).length;

  function handleCreate() {
    newProject();
    router.push("/editor");
  }
  function handleOpen(id: string) {
    loadProject(id);
    router.push("/editor");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            News <span className="text-accent-soft">Video</span> Generator
          </h1>
          <p className="text-sm text-slate-400">Deterministic, template-driven news videos — no AI.</p>
        </div>
        <Button onClick={handleCreate}>＋ New Project</Button>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <nav className="flex flex-row gap-2 md:flex-col">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors ${
                tab === t.id ? "bg-surface-raised text-white" : "text-slate-400 hover:bg-surface-raised/60"
              }`}
            >
              <span className="text-lg">{t.icon}</span>
              <span className="hidden md:inline">{t.label}</span>
              {t.id === "queue" && mounted && activeJobs > 0 ? (
                <span className="ml-auto hidden rounded-full bg-accent px-2 text-xs text-white md:inline">
                  {activeJobs}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <section>
          {tab === "create" && <CreatePanel onCreate={handleCreate} />}
          {tab === "saved" && (
            <SavedPanel projects={mounted ? saved : []} onOpen={handleOpen} onDelete={deleteProject} />
          )}
          {tab === "queue" && <ExportQueue queue={exportQueue} />}
          {tab === "settings" && <SettingsPanel />}
        </section>
      </div>
    </div>
  );
}

function CreatePanel({ onCreate }: { onCreate: () => void }) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-bold">Start from a template</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Object.values(TEMPLATES).map((t) => (
          <Card key={t.id} className="flex flex-col justify-between p-5">
            <div>
              <div className="mb-1 text-base font-bold text-white">{t.name}</div>
              <p className="text-sm text-slate-400">{t.description}</p>
            </div>
            <Button className="mt-4 self-start" onClick={onCreate}>
              Use template →
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SavedPanel({
  projects,
  onOpen,
  onDelete,
}: {
  projects: ReturnType<typeof useProjectStore.getState>["saved"];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (projects.length === 0)
    return <Empty title="No saved projects yet" hint="Create a project and click Save in the editor." />;
  return (
    <div className="space-y-3">
      {projects.map((p) => (
        <Card key={p.id} className="flex items-center justify-between p-4">
          <div>
            <div className="font-bold text-white">{p.name}</div>
            <div className="text-xs text-slate-500">
              {TEMPLATES[p.settings.templateId]?.name} · {p.settings.resolution} · {p.settings.aspectRatio} · updated{" "}
              {formatDate(p.updatedAt.slice(0, 10))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpen(p.id)}>
              Open
            </Button>
            <Button variant="ghost" onClick={() => onDelete(p.id)}>
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SettingsPanel() {
  return (
    <Card className="p-6">
      <h2 className="mb-2 text-lg font-bold">Settings</h2>
      <ul className="space-y-2 text-sm text-slate-400">
        <li>• Rendering engine: Remotion (local, offline) — MP4 (H.264) &amp; WebM (VP8)</li>
        <li>• AI services: none — all output is deterministic template rendering</li>
        <li>• Storage: browser localStorage (project library)</li>
        <li>• Queue: server-side, one active render at a time (bounded memory)</li>
      </ul>
    </Card>
  );
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center">
      <div className="text-base font-bold text-slate-300">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{hint}</div>
    </Card>
  );
}
