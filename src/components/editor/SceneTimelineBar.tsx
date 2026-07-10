"use client";

import React from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import { TEMPLATES } from "@/remotion/templates/registry";

/**
 * Horizontal scene timeline shown directly above the live preview. Each card is
 * one story scene (Scene 1, 2, 3 …) showing its template, headline and length.
 * Click a card to edit that scene in the form; use ＋ to append a fresh blank
 * scene. On export, scenes render sequentially into one video.
 */
export function SceneTimelineBar() {
  const scenes = useProjectStore((s) => s.current.storyScenes);
  const activeSceneId = useProjectStore((s) => s.current.activeSceneId);
  const selectScene = useProjectStore((s) => s.selectScene);
  const addScene = useProjectStore((s) => s.addScene);
  const removeScene = useProjectStore((s) => s.removeScene);
  const reorderScene = useProjectStore((s) => s.reorderScene);

  const total = scenes.reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);

  return (
    <div className="mb-3 rounded-xl border border-surface-border bg-surface-raised/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Scene Timeline · {scenes.length} scene{scenes.length > 1 ? "s" : ""} · {total.toFixed(1)}s
        </span>
        <button
          onClick={addScene}
          className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white hover:bg-accent-soft"
        >
          ＋ Add scene
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {scenes.map((scene, i) => {
          const isActive = scene.id === activeSceneId;
          const templateName = TEMPLATES[scene.templateId]?.name ?? scene.templateId;
          const headline = scene.content.headline?.trim();
          return (
            <div
              key={scene.id}
              onClick={() => selectScene(scene.id)}
              className={`group relative w-44 shrink-0 cursor-pointer rounded-lg border p-2 transition-colors ${
                isActive
                  ? "border-accent-soft bg-surface"
                  : "border-surface-border bg-surface hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isActive ? "text-accent-soft" : "text-slate-300"}`}>
                  {i + 1}. {scene.name}
                </span>
                <span className="text-[10px] text-slate-500">{(Number(scene.durationSeconds) || 0).toFixed(1)}s</span>
              </div>
              <div className="mt-1 truncate text-[11px] text-slate-400">{templateName}</div>
              <div className="mt-0.5 line-clamp-2 h-8 text-[11px] text-slate-500">
                {headline || <span className="italic text-slate-600">Empty — click to fill</span>}
              </div>

              {/* Controls (appear on hover / when active) */}
              <div
                className={`mt-1 flex items-center justify-end gap-1 ${
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              >
                <MiniBtn
                  label="Move left"
                  disabled={i === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    reorderScene(scene.id, -1);
                  }}
                >
                  ←
                </MiniBtn>
                <MiniBtn
                  label="Move right"
                  disabled={i === scenes.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    reorderScene(scene.id, 1);
                  }}
                >
                  →
                </MiniBtn>
                <MiniBtn
                  label="Delete scene"
                  disabled={scenes.length <= 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeScene(scene.id);
                  }}
                >
                  ✕
                </MiniBtn>
              </div>
            </div>
          );
        })}

        {/* Add-scene tile at the end of the strip */}
        <button
          onClick={addScene}
          className="flex w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-surface-border text-slate-500 hover:border-accent-soft hover:text-accent-soft"
          title="Add scene"
        >
          <span className="text-2xl leading-none">＋</span>
          <span className="mt-1 text-[10px]">Scene</span>
        </button>
      </div>
    </div>
  );
}

function MiniBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-surface-border px-1.5 py-0.5 text-[11px] text-slate-400 enabled:hover:text-white disabled:opacity-25"
    >
      {children}
    </button>
  );
}
