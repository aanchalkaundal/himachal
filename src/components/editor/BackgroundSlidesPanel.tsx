"use client";

import React, { useRef, useState } from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import { fileToDataUrl } from "@/lib/file";
import { removeGreenScreen } from "@/lib/chromaKey";
import { mediaKindFromFile, ACCEPT_IMAGE_VIDEO } from "@/lib/mediaType";
import { createId } from "@/lib/defaults";
import { assetManager } from "@/lib/assets/assetManager";
import { Button } from "@/components/ui/primitives";
import type { BackgroundSlide } from "@/types/project";

/** Stable reference so the store selector doesn't return a fresh array each
 * render (which would break useSyncExternalStore's snapshot caching). */
const NO_SLIDES: BackgroundSlide[] = [];

/** Read a video's duration (seconds) from its data URL. */
function getVideoDuration(src: string): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 6);
    v.onerror = () => resolve(6);
    v.src = src;
  });
}

/**
 * Multi-image background slideshow editor. Users add any number of images and,
 * per image, set how long it shows (duration), where the zoom is aimed (click
 * the image to drop the focal point), and how fast it zooms (speed slider).
 * All of this feeds `media.backgroundSlides` which the Background renderer plays
 * back deterministically.
 */
export function BackgroundSlidesPanel() {
  const slides = useProjectStore((s) => {
    const active = s.current.storyScenes.find((sc) => sc.id === s.current.activeSceneId);
    return active?.media?.backgroundSlides ?? NO_SLIDES;
  });
  const addBackgroundSlide = useProjectStore((s) => s.addBackgroundSlide);
  const moveBackgroundSlide = useProjectStore((s) => s.moveBackgroundSlide);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  function addTextCard() {
    const slide: BackgroundSlide = {
      id: createId("slide"),
      kind: "text",
      src: "",
      text: "Your text here",
      textColor: "#ffffff",
      bgColor: "#0b1f3a",
      fontSize: 64,
      align: "center",
      cardStyle: "title",
      durationSeconds: 4,
      focalX: 50,
      focalY: 50,
      zoomSpeed: 0,
    };
    addBackgroundSlide(slide);
  }

  async function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const kind = mediaKindFromFile(file);
      if (kind !== "image" && kind !== "video") continue;
      const isVideo = kind === "video";
      const dataUrl = await fileToDataUrl(file);
      const src = assetManager.register(isVideo ? "video" : "image", dataUrl, file.name);
      // Match a video slide's duration to the clip's real length so it doesn't
      // freeze on the last frame partway through the slide.
      const vidLen = isVideo ? await getVideoDuration(dataUrl) : 0;
      const slide: BackgroundSlide = {
        id: createId("slide"),
        kind: isVideo ? "video" : "image",
        src,
        durationSeconds: isVideo ? vidLen : 4,
        videoDurationSeconds: isVideo ? vidLen : undefined,
        focalX: 50,
        focalY: 50,
        // Zoom is optional for video → default off (0); images get a gentle push.
        zoomSpeed: isVideo ? 0 : 8,
      };
      addBackgroundSlide(slide);
    }
    // Allow re-selecting the same file(s) again.
    if (fileRef.current) fileRef.current.value = "";
  }

  const hasStandaloneBase = useProjectStore((s) => {
    const a = s.current.storyScenes.find((sc) => sc.id === s.current.activeSceneId);
    return Boolean(a?.media?.backgroundImage || a?.media?.backgroundVideo);
  });

  const baseCount = slides.filter((s) => (s.layer ?? "base") === "base").length;
  const overlayCount = slides.filter((s) => s.layer === "overlay").length;
  const hasBase = baseCount > 0 || hasStandaloneBase;
  const overlayNeedsBase = overlayCount > 0 && !hasBase;
  const totalSeconds = slides.reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);

  return (
    <div className="rounded-md border border-surface-border bg-surface p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Background Slideshow · this scene
          </span>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Items play in order. Tick &ldquo;on top (overlay)&rdquo; to layer an item over the item
            <span className="font-semibold"> just before it</span> (e.g. a green-screen subject over that
            background) — for its own duration, capped to that background&apos;s time.
            {slides.length > 0 ? ` · ${slides.length} item${slides.length > 1 ? "s" : ""} · ${totalSeconds.toFixed(1)}s total` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept={ACCEPT_IMAGE_VIDEO} multiple className="hidden" onChange={handleAdd} />
          <Button variant="outline" onClick={addTextCard}>
            ＋ Text card
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            ＋ Add media
          </Button>
        </div>
      </div>

      {overlayNeedsBase ? (
        <div className="mb-2 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-300">
          ⚠ An overlay item has nothing behind it. Add a background item (leave &ldquo;Place on top&rdquo;
          <span className="font-semibold"> unchecked</span>) — the overlay layers over it. Right now it sits over the gradient.
        </div>
      ) : null}

      {slides.length === 0 ? (
        <div className="rounded border border-dashed border-surface-border p-4 text-center text-xs text-slate-600">
          No slideshow media. Add images/videos to build the scene background.
          The first (base) items are the background; tick &ldquo;Place on top&rdquo; to layer media above them.
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId && dragId !== slide.id) moveBackgroundSlide(dragId, i);
                setDragId(null);
              }}
              className={`flex gap-1 rounded-md ${dragId === slide.id ? "opacity-50" : ""}`}
            >
              {/* Drag handle — reorder; the video plays in this order */}
              <div
                draggable
                onDragStart={() => setDragId(slide.id)}
                onDragEnd={() => setDragId(null)}
                title="Drag to reorder"
                className="flex w-5 shrink-0 cursor-grab items-center justify-center rounded bg-surface text-slate-600 hover:text-white active:cursor-grabbing"
              >
                ⠿
              </div>
              <div className="min-w-0 flex-1">
                {slide.kind === "text" ? (
                  <TextCardRow slide={slide} index={i} count={slides.length} />
                ) : (
                  <SlideRow slide={slide} index={i} count={slides.length} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SlideRow({ slide, index, count }: { slide: BackgroundSlide; index: number; count: number }) {
  const update = useProjectStore((s) => s.updateBackgroundSlide);
  const remove = useProjectStore((s) => s.removeBackgroundSlide);
  const reorder = useProjectStore((s) => s.reorderBackgroundSlide);

  // Backfill the video's own length for older slides (added before this field
  // existed) so looping knows the clip length.
  React.useEffect(() => {
    if (slide.kind === "video" && !slide.videoDurationSeconds && slide.src) {
      getVideoDuration(slide.src).then((d) => {
        if (d > 0) update(slide.id, { videoDurationSeconds: d });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide.id, slide.kind]);

  function pickFocal(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    update(slide.id, { focalX: clamp(x, 0, 100), focalY: clamp(y, 0, 100) });
  }

  function handleRemove() {
    assetManager.release(slide.rawSrc ?? slide.src);
    remove(slide.id);
  }

  const isVideo = slide.kind === "video";
  const [keying, setKeying] = useState(false);

  async function toggleGreenScreen(on: boolean) {
    // Video: keyed live at render via an SVG chroma-key filter (no baking).
    if (isVideo) {
      update(slide.id, { chromaKey: on });
      return;
    }
    // Image: bake transparency into a new PNG so it's instant and portable.
    if (on) {
      setKeying(true);
      try {
        const raw = slide.rawSrc ?? slide.src;
        const keyed = await removeGreenScreen(raw);
        update(slide.id, { chromaKey: true, rawSrc: raw, src: keyed });
      } finally {
        setKeying(false);
      }
    } else {
      update(slide.id, { chromaKey: false, src: slide.rawSrc ?? slide.src });
    }
  }

  return (
    <div className="rounded-md border border-surface-border bg-surface-raised p-3">
      <div className="space-y-2">
        {/* Focal-point picker: full-width preview (scales with the panel width). */}
        <div
          className="relative aspect-video w-full cursor-crosshair overflow-hidden rounded bg-black"
          onClick={pickFocal}
          title="Click to set the zoom focal point"
        >
          {isVideo ? (
            <video src={slide.src} muted playsInline className="h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slide.src} alt={`Slide ${index + 1}`} className="h-full w-full object-cover" />
          )}
          {/* Crosshair marker at the focal point */}
          <div
            className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{ left: `${slide.focalX}%`, top: `${slide.focalY}%`, boxShadow: "0 0 0 1px rgba(0,0,0,0.6)" }}
          />
          {isVideo ? (
            <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-[10px] font-bold text-white">
              ▶ VIDEO
            </span>
          ) : null}
        </div>
        <div className="text-center text-[10px] text-slate-500">
          focus {slide.focalX}%, {slide.focalY}% — click to move
        </div>

        {/* Controls (below the preview) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              {isVideo ? "Video" : "Image"} {index + 1}
              {slide.layer === "overlay" ? (
                <span className="ml-1 rounded bg-accent/20 px-1 text-[9px] text-accent-soft">OVERLAY</span>
              ) : null}
            </span>
            <div className="flex items-center gap-1">
              <IconBtn label="Move up" disabled={index === 0} onClick={() => reorder(slide.id, -1)}>↑</IconBtn>
              <IconBtn label="Move down" disabled={index === count - 1} onClick={() => reorder(slide.id, 1)}>↓</IconBtn>
              <button
                onClick={handleRemove}
                className="rounded px-2 py-0.5 text-xs text-slate-500 hover:text-accent-soft"
              >
                Remove
              </button>
            </div>
          </div>

          {/* Duration */}
          <label className="block">
            <span className="text-[11px] text-slate-400">Show for (seconds)</span>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={slide.durationSeconds}
              onChange={(e) => update(slide.id, { durationSeconds: Math.max(0.5, Number(e.target.value) || 0.5) })}
              className="mt-1 w-full rounded border border-surface-border bg-surface px-2 py-1 text-sm text-white outline-none focus:border-accent-soft"
            />
          </label>

          {/* Playback speed (video only) */}
          {isVideo ? (
            <label className="block">
              <span className="text-[11px] text-slate-400">Video speed</span>
              <select
                value={String(slide.playbackRate ?? 1)}
                onChange={(e) => update(slide.id, { playbackRate: Number(e.target.value) })}
                className="mt-1 w-full rounded border border-surface-border bg-surface px-2 py-1 text-sm text-white outline-none focus:border-accent-soft"
              >
                <option value="0.25">0.25× (slow-mo)</option>
                <option value="0.5">0.5×</option>
                <option value="0.75">0.75×</option>
                <option value="1">1× (normal)</option>
                <option value="1.25">1.25×</option>
                <option value="1.5">1.5×</option>
                <option value="2">2× (fast)</option>
                <option value="3">3×</option>
                <option value="4">4×</option>
              </select>
            </label>
          ) : null}

          {/* Loop video (fill a longer duration without freezing) */}
          {isVideo ? (
            <label className="flex items-center gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={!!slide.loop}
                onChange={(e) => update(slide.id, { loop: e.target.checked })}
              />
              <span>Loop video (repeat to fill the duration)</span>
            </label>
          ) : null}

          {/* Zoom direction + speed (optional for videos) */}
          {(() => {
            const dir = slide.zoomSpeed > 0 ? "in" : slide.zoomSpeed < 0 ? "out" : "none";
            const mag = Math.abs(slide.zoomSpeed) || 8;
            const setDir = (d: "in" | "out" | "none") =>
              update(slide.id, { zoomSpeed: d === "none" ? 0 : (d === "in" ? 1 : -1) * mag });
            const ZBtn = ({ d, label }: { d: "in" | "out" | "none"; label: string }) => (
              <button
                onClick={() => setDir(d)}
                className={`flex-1 rounded border px-2 py-1 text-[11px] ${
                  dir === d ? "border-accent-soft bg-surface-raised text-white" : "border-surface-border text-slate-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            );
            return (
              <div>
                <span className="text-[11px] text-slate-400">Zoom{isVideo ? " (optional)" : ""}</span>
                <div className="mt-1 flex gap-1">
                  <ZBtn d="in" label="🔍 Zoom in" />
                  <ZBtn d="out" label="🔎 Zoom out" />
                  <ZBtn d="none" label="None" />
                </div>
                {dir !== "none" ? (
                  <label className="mt-2 block">
                    <span className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Speed</span>
                      <span>{mag}%/s</span>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      step={1}
                      value={mag}
                      onChange={(e) => update(slide.id, { zoomSpeed: (dir === "in" ? 1 : -1) * Number(e.target.value) })}
                      className="mt-1 w-full accent-accent"
                    />
                  </label>
                ) : null}
              </div>
            );
          })()}

          {/* Green screen removal (images baked, videos keyed live at render) */}
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={!!slide.chromaKey}
              disabled={keying}
              onChange={(e) => toggleGreenScreen(e.target.checked)}
            />
            <span>
              Remove green screen
              {keying ? " — processing…" : slide.chromaKey ? " ✓" : ""}
              {isVideo ? <span className="text-slate-600"> (live)</span> : null}
            </span>
          </label>

          {/* Layer: base (background) vs overlay (on top of the background) */}
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={slide.layer === "overlay"}
              onChange={(e) => update(slide.id, { layer: e.target.checked ? "overlay" : "base" })}
            />
            <span>
              Place on top (overlay)
             
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

/** Editor row for a typed text card (no image/video). */
function TextCardRow({ slide, index, count }: { slide: BackgroundSlide; index: number; count: number }) {
  const update = useProjectStore((s) => s.updateBackgroundSlide);
  const remove = useProjectStore((s) => s.removeBackgroundSlide);
  const reorder = useProjectStore((s) => s.reorderBackgroundSlide);

  return (
    <div className="rounded-md border border-surface-border bg-surface-raised p-3">
      <div className="space-y-2">
        {/* Live preview of the card — full width, scales with the panel. */}
        <div
          className="flex aspect-video w-full items-center justify-center overflow-hidden rounded p-4 text-center"
          style={{ background: slide.bgColor || "transparent", color: slide.textColor || "#fff" }}
        >
          <span className="line-clamp-4 text-sm font-bold leading-tight">{slide.text || "…"}</span>
        </div>
        <div className="text-center text-[10px] text-slate-500">text card preview</div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Text {index + 1}
              {slide.layer === "overlay" ? (
                <span className="ml-1 rounded bg-accent/20 px-1 text-[9px] text-accent-soft">OVERLAY</span>
              ) : null}
            </span>
            <div className="flex items-center gap-1">
              <IconBtn label="Move up" disabled={index === 0} onClick={() => reorder(slide.id, -1)}>↑</IconBtn>
              <IconBtn label="Move down" disabled={index === count - 1} onClick={() => reorder(slide.id, 1)}>↓</IconBtn>
              <button onClick={() => remove(slide.id)} className="rounded px-2 py-0.5 text-xs text-slate-500 hover:text-accent-soft">
                Remove
              </button>
            </div>
          </div>

          <textarea
            rows={2}
            value={slide.text ?? ""}
            placeholder="Type your text…"
            onChange={(e) => update(slide.id, { text: e.target.value })}
            className="w-full rounded border border-surface-border bg-surface px-2 py-1 text-sm text-white outline-none focus:border-accent-soft"
          />

          <label className="block">
            <span className="text-[11px] text-slate-400">Style (professional presets)</span>
            <select
              value={slide.cardStyle ?? "title"}
              onChange={(e) => update(slide.id, { cardStyle: e.target.value as NonNullable<BackgroundSlide["cardStyle"]> })}
              className="mt-1 w-full rounded border border-surface-border bg-surface px-2 py-1 text-sm text-white outline-none focus:border-accent-soft"
            >
              <option value="title">Title — big heading + accent underline</option>
              <option value="banner">Banner — bold text in an accent strip</option>
              <option value="quote">Quote — italic with accent quote bar</option>
              <option value="lowerThird">Lower Third — bottom name-plate</option>
              <option value="gradient">Gradient — gradient background</option>
              <option value="highlight">Highlight — marker-style highlight</option>
              <option value="plain">Plain — simple centered text</option>
            </select>
          </label>

          <div className="grid grid-cols-3 gap-2">
            <label className="block">
              <span className="text-[11px] text-slate-400">Show for (s)</span>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={slide.durationSeconds}
                onChange={(e) => update(slide.id, { durationSeconds: Math.max(0.5, Number(e.target.value) || 0.5) })}
                className="mt-1 w-full rounded border border-surface-border bg-surface px-2 py-1 text-sm text-white outline-none focus:border-accent-soft"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-400">Font size</span>
              <input
                type="number"
                min={12}
                step={2}
                value={slide.fontSize ?? 64}
                onChange={(e) => update(slide.id, { fontSize: Math.max(12, Number(e.target.value) || 64) })}
                className="mt-1 w-full rounded border border-surface-border bg-surface px-2 py-1 text-sm text-white outline-none focus:border-accent-soft"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-400">Align</span>
              <select
                value={slide.align ?? "center"}
                onChange={(e) => update(slide.id, { align: e.target.value as "left" | "center" | "right" })}
                className="mt-1 w-full rounded border border-surface-border bg-surface px-2 py-1 text-sm text-white outline-none focus:border-accent-soft"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-[11px] text-slate-300">
              Text
              <input
                type="color"
                value={slide.textColor || "#ffffff"}
                onChange={(e) => update(slide.id, { textColor: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border border-surface-border bg-surface"
              />
            </label>
            <label className="flex items-center gap-2 text-[11px] text-slate-300">
              Background
              <input
                type="color"
                value={slide.bgColor && slide.bgColor !== "transparent" ? slide.bgColor : "#0b1f3a"}
                onChange={(e) => update(slide.id, { bgColor: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border border-surface-border bg-surface"
              />
            </label>
            <label className="flex items-center gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={slide.bgColor === "transparent"}
                onChange={(e) => update(slide.id, { bgColor: e.target.checked ? "transparent" : "#0b1f3a" })}
              />
              No background (over media)
            </label>
          </div>

          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={slide.layer === "overlay"}
              onChange={(e) => update(slide.id, { layer: e.target.checked ? "overlay" : "base" })}
            />
            Place on top (overlay)
           
          </label>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded border border-surface-border px-1.5 py-0.5 text-xs text-slate-400 enabled:hover:text-white disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
