"use client";

import React, { useEffect, useRef, useState } from "react";
import type { PlayerRef } from "@remotion/player";
import { useProjectStore } from "@/lib/store/projectStore";
import { fileToDataUrl } from "@/lib/file";
import { createId } from "@/lib/defaults";
import { assetManager } from "@/lib/assets/assetManager";
import { getWaveform } from "@/lib/waveform";
import { mediaKindFromFile, ACCEPT_AUDIO } from "@/lib/mediaType";
import type { AudioClip } from "@/types/project";

const LANES = 3;
const LANE_H = 44; // px per lane
const GRID = 0.25; // snap grid (seconds)

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const snap = (s: number) => Math.round(s / GRID) * GRID;

/** Pick a readable label interval (seconds) so ticks are ~≥60px apart. */
const TICK_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
function niceInterval(zoom: number): number {
  const minPx = 64;
  const wantSec = minPx / zoom;
  return TICK_STEPS.find((s) => s >= wantSec) ?? 3600;
}
/** Seconds → "12s" or "3:05" for longer timelines. */
function fmtTime(t: number): string {
  if (t < 60) return `${Math.round(t)}s`;
  const m = Math.floor(t / 60);
  const s = Math.round(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Professional-style audio timeline: multi-lane tracks, waveforms, a time ruler,
 * a playhead synced to the preview (click to seek), drag-to-move, edge-drag trim,
 * snapping, per-clip fades/volume/loop/mute, duplicate and delete-key. Clips
 * render through <AudioTimeline> so they play in the preview and the export.
 */
export function AudioTimelineBar({
  totalSeconds,
  fps,
  playerRef,
}: {
  totalSeconds: number;
  fps: number;
  playerRef?: React.RefObject<PlayerRef | null>;
}) {
  const clips = useProjectStore((s) => s.current.audioClips);
  const addAudioClip = useProjectStore((s) => s.addAudioClip);
  const updateAudioClip = useProjectStore((s) => s.updateAudioClip);
  const removeAudioClip = useProjectStore((s) => s.removeAudioClip);

  const fileRef = useRef<HTMLInputElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [playSec, setPlaySec] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(24); // px per second (fixed scale → horizontal scroll for long videos)

  const span = Math.max(totalSeconds, 1);
  const innerWidth = span * zoom;
  const pxPerSec = () => zoom;

  // Fit the whole timeline into the visible width.
  function fitZoom() {
    const w = scrollRef.current?.clientWidth ?? 0;
    if (w > 0) setZoom(clamp(w / span, 1, 400));
  }

  // Playhead: follow the preview's current frame; allow click-to-seek.
  useEffect(() => {
    let raf = 0;
    let detach: (() => void) | undefined;
    const attach = () => {
      const p = playerRef?.current;
      if (p) {
        const cb = (e: { detail: { frame: number } }) => setPlaySec(e.detail.frame / fps);
        p.addEventListener("frameupdate", cb);
        detach = () => p.removeEventListener("frameupdate", cb);
      } else {
        raf = requestAnimationFrame(attach);
      }
    };
    attach();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      detach?.();
    };
  }, [playerRef, fps]);

  // Delete key removes the selected clip (unless typing in a field).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (selected) {
        const c = clips.find((x) => x.id === selected);
        if (c) assetManager.release(c.src);
        removeAudioClip(selected);
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, clips, removeAudioClip]);

  async function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (mediaKindFromFile(file) !== "audio") continue;
      const dataUrl = await fileToDataUrl(file);
      const src = assetManager.register("audio", dataUrl, file.name);
      const { duration } = await getWaveform(dataUrl);
      const len = duration || 5;
      const clip: AudioClip = {
        id: createId("audio"),
        name: file.name.replace(/\.[^.]+$/, ""),
        src,
        startSeconds: snap(clamp(playSec, 0, Math.max(0, span - Math.min(len, span)))),
        durationSeconds: Math.min(len, span),
        trimStartSeconds: 0,
        volume: 1,
        fadeInSeconds: 0,
        fadeOutSeconds: 0,
        lane: 0,
        loop: false,
        muted: false,
        sourceDurationSeconds: len,
      };
      addAudioClip(clip);
      setSelected(clip.id);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function seekAt(clientX: number) {
    const lane = lanesRef.current;
    const p = playerRef?.current;
    if (!lane || !p) return;
    const rect = lane.getBoundingClientRect();
    const sec = clamp(((clientX - rect.left) / rect.width) * span, 0, span);
    p.seekTo(Math.round(sec * fps));
    setPlaySec(sec);
  }

  // Drag a clip: move start (x) + lane (y).
  function startMove(e: React.PointerEvent, clip: AudioClip) {
    e.stopPropagation();
    setSelected(clip.id);
    const rect = lanesRef.current?.getBoundingClientRect();
    const per = pxPerSec();
    const startX = e.clientX;
    const origStart = clip.startSeconds;

    function onMove(ev: PointerEvent) {
      const deltaSec = (ev.clientX - startX) / per;
      const nextStart = snap(clamp(origStart + deltaSec, 0, Math.max(0, span - clip.durationSeconds)));
      let lane = clip.lane;
      if (rect) lane = clamp(Math.floor((ev.clientY - rect.top) / LANE_H), 0, LANES - 1);
      updateAudioClip(clip.id, { startSeconds: nextStart, lane });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // Drag a clip edge to trim.
  function startTrim(e: React.PointerEvent, clip: AudioClip, edge: "left" | "right") {
    e.stopPropagation();
    e.preventDefault();
    setSelected(clip.id);
    const per = pxPerSec();
    const startX = e.clientX;
    const o = { start: clip.startSeconds, dur: clip.durationSeconds, trim: clip.trimStartSeconds };
    const srcMax = clip.sourceDurationSeconds || o.trim + o.dur;

    function onMove(ev: PointerEvent) {
      const deltaSec = (ev.clientX - startX) / per;
      if (edge === "left") {
        const right = o.start + o.dur; // keep right edge fixed
        const newStart = snap(clamp(o.start + deltaSec, Math.max(0, o.start - o.trim), right - GRID));
        const applied = newStart - o.start;
        updateAudioClip(clip.id, {
          startSeconds: newStart,
          trimStartSeconds: Math.max(0, o.trim + applied),
          durationSeconds: right - newStart,
        });
      } else {
        const maxByEnd = span - o.start;
        const maxBySrc = clip.loop ? Infinity : srcMax - o.trim;
        const newDur = snap(clamp(o.dur + deltaSec, GRID, Math.min(maxByEnd, maxBySrc)));
        updateAudioClip(clip.id, { durationSeconds: newDur });
      }
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function duplicate(clip: AudioClip) {
    const copy: AudioClip = {
      ...clip,
      id: createId("audio"),
      startSeconds: snap(clamp(clip.startSeconds + 0.5, 0, Math.max(0, span - clip.durationSeconds))),
    };
    addAudioClip(copy);
    setSelected(copy.id);
  }

  const sel = clips.find((c) => c.id === selected) ?? null;
  const interval = niceInterval(zoom); // seconds between ruler labels/gridlines

  return (
    <div className="mt-3 rounded-xl border border-surface-border bg-surface-raised/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Audio Timeline · {clips.length} clip{clips.length === 1 ? "" : "s"} · {span.toFixed(1)}s
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => clamp(z / 1.5, 1, 400))} title="Zoom out" className="rounded border border-surface-border px-2 py-1 text-xs text-slate-400 hover:text-white">－</button>
          <button onClick={fitZoom} title="Fit to width" className="rounded border border-surface-border px-2 py-1 text-[11px] text-slate-400 hover:text-white">Fit</button>
          <button onClick={() => setZoom((z) => clamp(z * 1.5, 1, 400))} title="Zoom in" className="rounded border border-surface-border px-2 py-1 text-xs text-slate-400 hover:text-white">＋</button>
          <input ref={fileRef} type="file" accept={ACCEPT_AUDIO} multiple className="hidden" onChange={handleAdd} />
          <button
            onClick={() => fileRef.current?.click()}
            className="ml-1 rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white hover:bg-accent-soft"
          >
            ＋ Add audio
          </button>
        </div>
      </div>

      {/* Horizontal-scrolling timeline: fixed px/second, so a long video scrolls
          instead of squeezing every clip into the panel width. */}
      <div className="relative">
        {clips.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[11px] text-slate-600">
            No audio. Click “＋ Add audio”, then drag to position • drag edges to trim • zoom with － ＋.
          </div>
        ) : null}
      <div ref={scrollRef} className="w-full overflow-x-auto overflow-y-hidden rounded-md border border-surface-border bg-surface">
        {/* Time ruler (click to seek) */}
        <div
          className="relative h-5 cursor-pointer select-none border-b border-surface-border text-[9px] text-slate-500"
          style={{ width: innerWidth }}
          onPointerDown={(e) => seekAt(e.clientX)}
        >
          {Array.from({ length: Math.floor(span / interval) + 1 }).map((_, i) => {
            const t = i * interval;
            return (
              <span key={i} className="absolute -translate-x-1/2" style={{ left: t * zoom }}>
                {fmtTime(t)}
              </span>
            );
          })}
        </div>

        {/* Lanes */}
        <div
          ref={lanesRef}
          onPointerDown={(e) => {
            setSelected(null);
            seekAt(e.clientX);
          }}
          className="relative"
          style={{ width: innerWidth, height: LANES * LANE_H }}
        >
          {/* lane separators */}
          {Array.from({ length: LANES }).map((_, l) => (
            <div key={`l${l}`} className="absolute left-0 right-0 border-b border-white/5" style={{ top: (l + 1) * LANE_H - 1, height: 1 }} />
          ))}
          {/* gridlines at the tick interval */}
          {Array.from({ length: Math.floor(span / interval) + 1 }).map((_, i) => (
            <div key={`g${i}`} className="absolute top-0 bottom-0 border-l border-white/5" style={{ left: i * interval * zoom }} />
          ))}

          {clips.map((clip) => {
            const left = clip.startSeconds * zoom;
            const width = Math.max(8, clip.durationSeconds * zoom);
            const isSel = clip.id === selected;
            return (
              <div
                key={clip.id}
                onPointerDown={(e) => startMove(e, clip)}
                className={`absolute cursor-grab overflow-hidden rounded active:cursor-grabbing ${isSel ? "ring-2 ring-white" : ""} ${clip.muted ? "opacity-50" : ""}`}
                style={{
                  left,
                  width,
                  top: clip.lane * LANE_H + 3,
                  height: LANE_H - 6,
                  background: "linear-gradient(180deg,#2563eb,#172554)",
                }}
                title={clip.name}
              >
                <Waveform
                  src={clip.src}
                  trimStartSeconds={clip.trimStartSeconds}
                  durationSeconds={clip.durationSeconds}
                  sourceDurationSeconds={clip.sourceDurationSeconds}
                />
                <span className="pointer-events-none absolute left-1 top-0.5 truncate pr-2 text-[10px] font-semibold text-white/90">
                  {clip.loop ? "🔁 " : ""}{clip.muted ? "🔇 " : "🎵 "}{clip.name}
                </span>
                {/* trim handles */}
                <div
                  onPointerDown={(e) => startTrim(e, clip, "left")}
                  className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-white/25 hover:bg-white/50"
                />
                <div
                  onPointerDown={(e) => startTrim(e, clip, "right")}
                  className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-white/25 hover:bg-white/50"
                />
              </div>
            );
          })}

          {/* playhead */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-accent-soft"
            style={{ left: clamp(playSec, 0, span) * zoom }}
          >
            <div className="absolute -left-1 -top-0.5 h-2 w-2 rotate-45 bg-accent-soft" />
          </div>
        </div>
      </div>
      </div>

      {/* Selected clip controls */}
      {sel ? (
        <div className="mt-3 rounded-md border border-surface-border bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">🎵 {sel.name}</span>
            <div className="flex items-center gap-2 text-xs">
              <button onClick={() => updateAudioClip(sel.id, { muted: !sel.muted })} className={sel.muted ? "text-accent-soft" : "text-slate-400 hover:text-white"}>
                {sel.muted ? "Unmute" : "Mute"}
              </button>
              <button onClick={() => updateAudioClip(sel.id, { loop: !sel.loop })} className={sel.loop ? "text-accent-soft" : "text-slate-400 hover:text-white"}>
                {sel.loop ? "Loop ✓" : "Loop"}
              </button>
              <button onClick={() => duplicate(sel)} className="text-slate-400 hover:text-white">Duplicate</button>
              <button
                onClick={() => {
                  assetManager.release(sel.src);
                  removeAudioClip(sel.id);
                  setSelected(null);
                }}
                className="text-slate-500 hover:text-accent-soft"
              >
                Remove
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Num label="Start (s)" value={sel.startSeconds} min={0} step={0.1} onChange={(v) => updateAudioClip(sel.id, { startSeconds: v })} />
            <Num label="Play length (s)" value={sel.durationSeconds} min={0.1} step={0.1} onChange={(v) => updateAudioClip(sel.id, { durationSeconds: v })} />
            <Num label="Cut from (s)" value={sel.trimStartSeconds} min={0} step={0.1} onChange={(v) => updateAudioClip(sel.id, { trimStartSeconds: v })} />
            <Num label="Fade in (s)" value={sel.fadeInSeconds} min={0} step={0.1} onChange={(v) => updateAudioClip(sel.id, { fadeInSeconds: v })} />
            <Num label="Fade out (s)" value={sel.fadeOutSeconds} min={0} step={0.1} onChange={(v) => updateAudioClip(sel.id, { fadeOutSeconds: v })} />
            <label className="block">
              <span className="flex justify-between text-[11px] text-slate-400">
                <span>Volume</span>
                <span className="text-slate-500">{Math.round(sel.volume * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={sel.volume}
                onChange={(e) => updateAudioClip(sel.id, { volume: Number(e.target.value) })}
                className="mt-2 w-full accent-accent"
              />
            </label>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-slate-500">
          Drag a clip to move (up/down = change track) • drag its edges to trim • click a clip to fade/volume/loop • Delete key removes.
        </p>
      )}
    </div>
  );
}

/** Canvas waveform for the trimmed window of a clip's source. */
function Waveform({
  src,
  trimStartSeconds,
  durationSeconds,
  sourceDurationSeconds,
}: {
  src: string;
  trimStartSeconds: number;
  durationSeconds: number;
  sourceDurationSeconds: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<number[]>([]);

  useEffect(() => {
    let alive = true;
    getWaveform(src).then((w) => {
      if (alive) setPeaks(w.peaks);
    });
    return () => {
      alive = false;
    };
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const total = peaks.length;
    if (!total) return;
    let a = 0;
    let b = total;
    if (sourceDurationSeconds > 0) {
      a = Math.floor((trimStartSeconds / sourceDurationSeconds) * total);
      b = Math.ceil(((trimStartSeconds + durationSeconds) / sourceDurationSeconds) * total);
    }
    a = clamp(a, 0, total - 1);
    b = clamp(b, a + 1, total);
    const n = b - a;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let x = 0; x < W; x++) {
      const idx = a + Math.floor((x / W) * n);
      const p = peaks[idx] || 0;
      const h = Math.max(1, p * (H - 2));
      ctx.fillRect(x, (H - h) / 2, 1, h);
    }
  }, [peaks, trimStartSeconds, durationSeconds, sourceDurationSeconds]);

  return <canvas ref={canvasRef} width={600} height={LANE_H - 6} className="pointer-events-none absolute inset-0 h-full w-full" />;
}

function Num({
  label,
  value,
  min,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-400">{label}</span>
      <input
        type="number"
        min={min}
        step={step}
        value={Math.round(value * 100) / 100}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        className="mt-1 w-full rounded border border-surface-border bg-surface px-2 py-1 text-sm text-white outline-none focus:border-accent-soft"
      />
    </label>
  );
}
