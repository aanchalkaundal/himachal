"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useProjectStore } from "@/lib/store/projectStore";
import { useExportQueue } from "@/lib/export/useExportQueue";
import { EditorForm } from "./EditorForm";
import { SceneTimelineBar } from "./SceneTimelineBar";
import { AudioTimelineBar } from "./AudioTimelineBar";
import { Button } from "@/components/ui/primitives";
import type { PlayerRef } from "@remotion/player";
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

  // Resizable editor panel width (only on wide screens).
  const splitRef = React.useRef<HTMLDivElement>(null);
  const [isWide, setIsWide] = React.useState(false);
  const [formWidth, setFormWidth] = React.useState(420);

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsWide(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    const saved = Number(localStorage.getItem("nvg-form-width"));
    if (Number.isFinite(saved) && saved >= 300) setFormWidth(saved);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const left = splitRef.current?.getBoundingClientRect().left ?? 0;
    function onMove(ev: PointerEvent) {
      const w = Math.max(300, Math.min(900, ev.clientX - left));
      setFormWidth(w);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      try {
        localStorage.setItem("nvg-form-width", String(Math.round(formWidthRef.current)));
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }
  // Keep latest width for the pointerup persist without re-binding listeners.
  const formWidthRef = React.useRef(formWidth);
  formWidthRef.current = formWidth;

  // Seek the preview to a scene's start frame when its timeline card is clicked,
  // so pressing Play resumes from that scene.
  const playerRef = React.useRef<PlayerRef>(null);
  function seekToScene(sceneId: string) {
    const tlScene = timeline.scenes.find((s) => s.data?.storyScene?.id === sceneId);
    playerRef.current?.seekTo(tlScene?.startFrame ?? 0);
  }

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

      <div ref={splitRef} className="flex flex-1 flex-col lg:min-h-0 lg:flex-row lg:overflow-hidden">
        {/* Editor form (resizable width on wide screens) */}
        <div
          className="border-b border-surface-border p-5 lg:min-h-0 lg:overflow-hidden lg:border-b-0 lg:border-r"
          style={isWide ? { width: formWidth, flex: "0 0 auto" } : undefined}
        >
          <EditorForm />
        </div>

        {/* Drag divider to resize the panel */}
        {isWide ? (
          <div
            onPointerDown={startResize}
            title="Drag to resize"
            className="group hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-surface-border hover:bg-accent lg:flex"
          >
            <div className="h-8 w-0.5 rounded bg-slate-600 group-hover:bg-white" />
          </div>
        ) : null}

        {/* Live preview — scene timeline, video (flexible), audio timeline all fit */}
        <div className="scrollable flex flex-1 flex-col bg-black/40 p-4 lg:min-h-0 lg:overflow-hidden">
          {/* Horizontal scene timeline — add/select/reorder scenes above the video */}
          <SceneTimelineBar onSeek={seekToScene} />
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>
              Live Preview · {timeline.scenes.length} scenes ({project.settings.aspectRatio})
            </span>
            <span>
              {width}×{height} · {project.settings.fps} fps ·{" "}
              {(timeline.totalDurationInFrames / timeline.fps).toFixed(1)}s
            </span>
          </div>

          {/* Video takes the remaining height and fits (letterboxed) so the audio
              timeline below stays visible without scrolling. */}
          <div className="flex min-h-[220px] flex-1 items-center justify-center lg:min-h-0">
            <PreviewPlayer project={project} playerRef={playerRef} fit />
          </div>

          {/* Audio timeline — add/drag/trim/fade audio; plays in preview & export */}
          <AudioTimelineBar
            totalSeconds={timeline.totalDurationInFrames / timeline.fps}
            fps={timeline.fps}
            playerRef={playerRef}
          />
        </div>
      </div>
    </div>
  );
}
