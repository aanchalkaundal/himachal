"use client";

import React, { useRef } from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import { fileToDataUrl } from "@/lib/file";
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
  const slides = useProjectStore((s) => s.current.media.backgroundSlides ?? NO_SLIDES);
  const addBackgroundSlide = useProjectStore((s) => s.addBackgroundSlide);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await fileToDataUrl(file);
      const src = assetManager.register("image", dataUrl, file.name);
      const slide: BackgroundSlide = {
        id: createId("slide"),
        src,
        durationSeconds: 4,
        focalX: 50,
        focalY: 50,
        zoomSpeed: 8,
      };
      addBackgroundSlide(slide);
    }
    // Allow re-selecting the same file(s) again.
    if (fileRef.current) fileRef.current.value = "";
  }

  const totalSeconds = slides.reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);

  return (
    <div className="rounded-md border border-surface-border bg-surface p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Background Slideshow
          </span>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Multiple images, each with its own duration, zoom point and speed. Loops to fill the video.
            {slides.length > 0 ? ` · ${slides.length} image${slides.length > 1 ? "s" : ""} · ${totalSeconds.toFixed(1)}s loop` : ""}
          </p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAdd} />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          ＋ Add images
        </Button>
      </div>

      {slides.length === 0 ? (
        <div className="rounded border border-dashed border-surface-border p-4 text-center text-xs text-slate-600">
          No slideshow images. Add images to build a zooming background sequence
          (this overrides the single Background Image below).
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
    assetManager.release(slide.src);
    remove(slide.id);
  }

  return (
    <div className="rounded-md border border-surface-border bg-surface-raised p-3">
      <div className="flex gap-3">
        {/* Focal-point picker: click the image to aim the zoom. */}
        <div className="shrink-0">
          <div
            className="relative h-24 w-40 cursor-crosshair overflow-hidden rounded"
            onClick={pickFocal}
            title="Click to set the zoom focal point"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.src} alt={`Slide ${index + 1}`} className="h-full w-full object-cover" />
            {/* Crosshair marker at the focal point */}
            <div
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${slide.focalX}%`, top: `${slide.focalY}%`, boxShadow: "0 0 0 1px rgba(0,0,0,0.6)" }}
            />
          </div>
          <div className="mt-1 text-center text-[10px] text-slate-500">
            focus {slide.focalX}%, {slide.focalY}% — click to move
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Image {index + 1}</span>
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

          {/* Zoom speed */}
          <label className="block">
            <span className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Zoom speed</span>
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
