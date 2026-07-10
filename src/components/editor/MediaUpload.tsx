"use client";

import React, { useRef } from "react";
import { fileToDataUrl } from "@/lib/file";
import { Button } from "@/components/ui/primitives";
import { assetManager, type AssetKind } from "@/lib/assets/assetManager";

interface MediaUploadProps {
  label: string;
  accept: string;
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  /** Asset kind for the centralized manager (dedup + stats). */
  kind: AssetKind;
  /** Whether to show a small image thumbnail preview. */
  preview?: boolean;
}

/** Reusable upload control: converts a file to a data URL, registers it with
 * the centralized asset manager (dedup), and stores it on the project. */
export function MediaUpload({ label, accept, value, onChange, kind, preview = true }: MediaUploadProps) {
  const ref = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    assetManager.release(value); // drop the previous file's reference, if any
    onChange(assetManager.register(kind, dataUrl, file.name));
  }

  function handleRemove() {
    assetManager.release(value);
    onChange(undefined);
  }

  return (
    <div className="rounded-md border border-surface-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        {value ? (
          <button className="text-xs text-slate-500 hover:text-accent-soft" onClick={handleRemove}>
            Remove
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {preview && value && accept.includes("image") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="h-12 w-12 rounded object-cover" />
        ) : value ? (
          <span className="text-xs text-emerald-400">✓ uploaded</span>
        ) : (
          <span className="text-xs text-slate-600">none</span>
        )}
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleFile} />
        <Button variant="outline" onClick={() => ref.current?.click()}>
          {value ? "Replace" : "Upload"}
        </Button>
      </div>
    </div>
  );
}
