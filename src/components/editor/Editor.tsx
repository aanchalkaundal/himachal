"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useProjectStore } from "@/lib/store/projectStore";
import { useExportQueue } from "@/lib/export/useExportQueue";
import { EditorForm } from "./EditorForm";
import { SceneTimelineBar } from "./SceneTimelineBar";
import { Button } from "@/components/ui/primitives";
import { getDimensions } from "@/types/project";
import { buildTimeline } from "@/lib/timeline/buildTimeline";

// The Remotion Player touches browser-only APIs; load it client-side only.
const PreviewPlayer = dynamic(() => import("@/components/preview/PreviewPlayer").then((m) => m.PreviewPlayer), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-surface-raised text-slate-500">
      Loading preview…
    </div>
  ),
});

export function Editor() {
  const project = useProjectStore((s) => s.current);
  const saveCurrent = useProjectStore((s) => s.saveCurrent);
  const { startRender } = useExportQueue();
  const [savedFlash, setSavedFlash] = React.useState(false);
  const [exportMsg, setExportMsg] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  function handleSave() {
    saveCurrent();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  async function handleExport() {
    setExporting(true);
    setExportMsg(null);
    try {
      saveCurrent(); // preserve the project before rendering
      await startRender(project);
      setExportMsg("Queued — track progress in the Export Queue.");
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : "Failed to start export");
    } finally {
      setExporting(false);
      setTimeout(() => setExportMsg(null), 5000);
    }
  }

  const { width, height } = getDimensions(project.settings.resolution, project.settings.aspectRatio);
  const timeline = buildTimeline(project);

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
      <header className="flex items-center justify-between border-b border-surface-border px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-white">
            ← Dashboard
          </Link>
          <span className="text-sm font-bold">{project.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave}>
            {savedFlash ? "✓ Saved" : "Save"}
          </Button>
          <Link href="/?tab=queue" className="text-sm text-slate-400 hover:text-white">
            Queue ↗
          </Link>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? "Starting…" : `⬇ Export ${project.settings.format.toUpperCase()}`}
          </Button>
        </div>
      </header>
      {exportMsg ? (
        <div className="border-b border-surface-border bg-surface-raised px-6 py-2 text-center text-sm text-slate-300">
          {exportMsg}
        </div>
      ) : null}

      <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-[420px_1fr] lg:overflow-hidden">
        {/* Editor form */}
        <div className="border-r border-surface-border p-5 lg:min-h-0 lg:overflow-hidden">
          <EditorForm />
        </div>

        {/* Live preview */}
        <div className="scrollable flex flex-col items-center justify-start bg-black/40 p-8 lg:overflow-y-auto">
          <div className="w-full max-w-4xl">
            {/* Horizontal scene timeline — add/select/reorder scenes above the video */}
            <SceneTimelineBar />
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                Live Preview · {timeline.scenes.length} scenes ({project.settings.aspectRatio})
              </span>
              <span>
                {width}×{height} · {project.settings.fps} fps ·{" "}
                {(timeline.totalDurationInFrames / timeline.fps).toFixed(1)}s
              </span>
            </div>
            <PreviewPlayer project={project} />
            <p className="mt-4 text-center text-xs text-slate-600">
              Every edit updates this preview instantly. The exported video renders this identical composition.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
