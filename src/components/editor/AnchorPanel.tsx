"use client";

import React, { useEffect, useState } from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import { Field, Select, Input, Button } from "@/components/ui/primitives";
import { listAnchorMetadata, getAnchorEntry } from "@/anchors/registry";
import { ensureAnchorLoaded, unloadUnusedAnchors } from "@/anchors/registry/cache";
import { createAnchorInstance } from "@/anchors/factory";
import type { AnchorInstance, AnchorPositionId, AnchorLayerId, AnchorTransition, AnchorAnimationId } from "@/anchors/types";
import { ANCHOR_ANIMATIONS } from "@/anchors/types";

const POSITIONS: AnchorPositionId[] = [
  "bottom-left",
  "bottom-right",
  "center-left",
  "center-right",
  "behind-desk",
  "full-body",
  "custom",
];
const LAYERS: AnchorLayerId[] = ["background", "desk", "middle", "front", "overlay"];
const TRANSITIONS: AnchorTransition[] = ["none", "fade", "slide-up", "slide-left", "slide-right", "scale"];

/**
 * Anchor Panel — the editor's anchor control surface. It's 100% registry-driven:
 * it lists whatever anchors are registered and never names one. Supports
 * multiple anchors, full placement/animation controls, layer ordering, and
 * lazily loads only the active anchors (unloading the rest) for performance.
 */
export function AnchorPanel() {
  const anchors = useProjectStore((s) => s.current.anchors);
  const addAnchor = useProjectStore((s) => s.addAnchor);
  const catalog = listAnchorMetadata();
  const [pick, setPick] = useState(catalog[0]?.id ?? "");

  // Performance: keep only active anchors loaded in the editor cache.
  useEffect(() => {
    const active = new Set(anchors.map((a) => a.anchorId));
    active.forEach((id) => void ensureAnchorLoaded(id));
    unloadUnusedAnchors(active);
  }, [anchors]);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="Add anchor">
            <Select value={pick} onChange={(e) => setPick(e.target.value)}>
              {catalog.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.category}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button
          onClick={() => {
            const meta = catalog.find((m) => m.id === pick);
            if (meta) addAnchor(createAnchorInstance(meta));
          }}
        >
          ＋ Add
        </Button>
      </div>

      {anchors.length === 0 ? (
        <p className="text-xs text-slate-500">
          No anchors yet. Add one or more presenters — they become per-scene timeline objects and appear in the live
          preview instantly.
        </p>
      ) : (
        anchors.map((a, i) => <AnchorRow key={a.instanceId} instance={a} index={i} total={anchors.length} />)
      )}
    </div>
  );
}

function AnchorRow({ instance, index, total }: { instance: AnchorInstance; index: number; total: number }) {
  const updateAnchor = useProjectStore((s) => s.updateAnchor);
  const removeAnchor = useProjectStore((s) => s.removeAnchor);
  const reorderAnchor = useProjectStore((s) => s.reorderAnchor);
  const [open, setOpen] = useState(true);

  const meta = getAnchorEntry(instance.anchorId)?.metadata;
  // Offer every preset (emotions + gestures work on the shared rig), not just the
  // anchor's suggested subset, so all emotions are available for any anchor.
  const animations: (AnchorAnimationId | "auto")[] = ["auto", ...ANCHOR_ANIMATIONS];
  const up = (patch: Partial<AnchorInstance>) => updateAnchor(instance.instanceId, patch);

  return (
    <div className="rounded-md border border-surface-border bg-surface">
      <div className="flex items-center justify-between px-3 py-2">
        <button className="flex items-center gap-2 text-sm font-bold text-white" onClick={() => setOpen((o) => !o)}>
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: meta?.thumbnailColor ?? "#64748b" }}
          />
          {meta?.name ?? instance.anchorId}
          <span className="text-xs font-normal text-slate-500">z:{instance.layer}</span>
        </button>
        <div className="flex items-center gap-1">
          <button className="px-1 text-slate-500 hover:text-white disabled:opacity-30" disabled={index === 0} onClick={() => reorderAnchor(instance.instanceId, -1)}>
            ↑
          </button>
          <button className="px-1 text-slate-500 hover:text-white disabled:opacity-30" disabled={index === total - 1} onClick={() => reorderAnchor(instance.instanceId, 1)}>
            ↓
          </button>
          <button className="px-1 text-slate-500 hover:text-red-400" onClick={() => removeAnchor(instance.instanceId)}>
            ✕
          </button>
        </div>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-surface-border p-3">
          <div className="flex flex-wrap gap-4">
            <Toggle label="Enabled" checked={instance.enabled} onChange={(v) => up({ enabled: v })} />
            <Toggle label="Visible" checked={instance.visible} onChange={(v) => up({ visible: v })} />
            <Toggle label="Shadow" checked={instance.shadow} onChange={(v) => up({ shadow: v })} />
            <Toggle label="Flip" checked={instance.flip} onChange={(v) => up({ flip: v })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Position">
              <Select value={instance.position} onChange={(e) => up({ position: e.target.value as AnchorPositionId })}>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Layer">
              <Select value={instance.layer} onChange={(e) => up({ layer: e.target.value as AnchorLayerId })}>
                {LAYERS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {instance.position === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label={`X ${instance.customPosition.x}%`}>
                <input type="range" min={0} max={100} value={instance.customPosition.x} className="w-full accent-accent" onChange={(e) => up({ customPosition: { ...instance.customPosition, x: Number(e.target.value) } })} />
              </Field>
              <Field label={`Y ${instance.customPosition.y}%`}>
                <input type="range" min={0} max={100} value={instance.customPosition.y} className="w-full accent-accent" onChange={(e) => up({ customPosition: { ...instance.customPosition, y: Number(e.target.value) } })} />
              </Field>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Slider label="Scale" min={0.4} max={2} step={0.05} value={instance.scale} onChange={(v) => up({ scale: v })} suffix="×" />
            <Slider label="Opacity" min={0} max={1} step={0.05} value={instance.opacity} onChange={(v) => up({ opacity: v })} pct />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Entry animation">
              <Select value={instance.entry} onChange={(e) => up({ entry: e.target.value as AnchorTransition })}>
                {TRANSITIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Exit animation">
              <Select value={instance.exit} onChange={(e) => up({ exit: e.target.value as AnchorTransition })}>
                {TRANSITIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Animation" hint="“auto” reads headline, talks the body and waves on the outro.">
            <Select value={instance.animation} onChange={(e) => up({ animation: e.target.value as AnchorAnimationId | "auto" })}>
              {animations.map((an) => (
                <option key={an} value={an}>
                  {an}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Visible in scenes">
            <Select
              value={instance.visibleScenes === "all" ? "all" : "custom"}
              onChange={(e) => up({ visibleScenes: e.target.value === "all" ? "all" : [] })}
            >
              <option value="all">All scenes</option>
              <option value="custom">Custom (none until picked)</option>
            </Select>
          </Field>
          {instance.visibleScenes !== "all" ? (
            <Field label="Scene indices (comma-separated)">
              <Input
                value={(instance.visibleScenes as number[]).join(",")}
                onChange={(e) =>
                  up({
                    visibleScenes: e.target.value
                      .split(",")
                      .map((n) => parseInt(n.trim(), 10))
                      .filter((n) => Number.isInteger(n)),
                  })
                }
              />
            </Field>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  suffix,
  pct,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  pct?: boolean;
}) {
  const readout = pct ? `${Math.round(value * 100)}%` : `${value.toFixed(2)}${suffix ?? ""}`;
  return (
    <Field label={`${label} — ${readout}`}>
      <input type="range" min={min} max={max} step={step} value={value} className="w-full accent-accent" onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  );
}
