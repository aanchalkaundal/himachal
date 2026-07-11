"use client";

import React, { useRef, useState } from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import { fileToDataUrl } from "@/lib/file";
import { removeGreenScreen } from "@/lib/chromaKey";
import { createId } from "@/lib/defaults";
import { assetManager } from "@/lib/assets/assetManager";
import { Button } from "@/components/ui/primitives";
import type { BackgroundSlide } from "@/types/project";

/** Stable reference so the store selector doesn't return a fresh array each
 * render (which would break useSyncExternalStore's snapshot caching). */
const NO_SLIDES: BackgroundSlide[] = [];

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
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) continue;
      const dataUrl = await fileToDataUrl(file);
      const src = assetManager.register(isVideo ? "video" : "image", dataUrl, file.name);
      const slide: BackgroundSlide = {
        id: createId("slide"),
        kind: isVideo ? "video" : "image",
        src,
        durationSeconds: isVideo ? 6 : 4,
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
            Images &amp; videos for the selected scene — each with its own duration &amp; zoom. Tick
            &ldquo;on top (overlay)&rdquo; to layer media over the background (great with green-screen removed).
            {slides.length > 0 ? ` · ${slides.length} item${slides.length > 1 ? "s" : ""} · ${totalSeconds.toFixed(1)}s total` : ""}
          </p>
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleAdd} />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          ＋ Add media
        </Button>
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
            <SlideRow key={slide.id} slide={slide} index={i} count={slides.length} />
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
      <div className="flex gap-3">
        {/* Focal-point picker: click the media to aim the zoom. */}
        <div className="shrink-0">
          <div
            className="relative h-24 w-40 cursor-crosshair overflow-hidden rounded bg-black"
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
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${slide.focalX}%`, top: `${slide.focalY}%`, boxShadow: "0 0 0 1px rgba(0,0,0,0.6)" }}
            />
            {isVideo ? (
              <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[9px] font-bold text-white">
                ▶ VIDEO
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-center text-[10px] text-slate-500">
            focus {slide.focalX}%, {slide.focalY}% — click to move
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-2">
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

          {/* Zoom speed (optional for videos) */}
          <label className="block">
            <span className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Zoom speed{isVideo ? " (optional)" : ""}</span>
              <span className="text-slate-500">
                {slide.zoomSpeed === 0 ? "none" : `${slide.zoomSpeed > 0 ? "in" : "out"} · ${Math.abs(slide.zoomSpeed)}%/s`}
              </span>
            </span>
            <input
              type="range"
              min={-20}
              max={30}
              step={1}
              value={slide.zoomSpeed}
              onChange={(e) => update(slide.id, { zoomSpeed: Number(e.target.value) })}
              className="mt-1 w-full accent-accent"
            />
          </label>

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
              {slide.layer === "overlay" ? <span className="text-accent-soft"> ▲</span> : null}
            </span>
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
