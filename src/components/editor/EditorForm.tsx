"use client";

import React from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import { Field, Input, Textarea, Select, SectionTitle } from "@/components/ui/primitives";
import { MediaUpload } from "./MediaUpload";
import { BackgroundSlidesPanel } from "./BackgroundSlidesPanel";
import { AnchorPanel } from "./AnchorPanel";
import { TEMPLATE_LIST } from "@/remotion/templates/registry";
import type { Resolution, Fps, AspectRatio, VideoFormat } from "@/types/project";

// Every stack ends with Devanagari fallbacks so Hindi (मात्रा included) always
// renders, whichever primary font is chosen.
const DEVANAGARI_FALLBACK = "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal'";
const FONTS = [
  `Arial, Helvetica, ${DEVANAGARI_FALLBACK}, sans-serif`,
  `Georgia, 'Times New Roman', ${DEVANAGARI_FALLBACK}, serif`,
  `'Segoe UI', system-ui, ${DEVANAGARI_FALLBACK}, sans-serif`,
  `'Noto Sans Devanagari', 'Nirmala UI', Arial, sans-serif`,
  `'Courier New', ${DEVANAGARI_FALLBACK}, monospace`,
];
const FONT_LABELS: Record<string, string> = {
  [`'Noto Sans Devanagari', 'Nirmala UI', Arial, sans-serif`]: "Hindi / Devanagari",
};
const ASPECTS: AspectRatio[] = ["16:9", "9:16", "1:1"];
const TRANSITIONS = ["fade", "slide", "wipe", "none"] as const;

/**
 * The full News Editor. Each control patches exactly one slice of the current
 * project in the store; the live preview subscribes to that same object, so
 * edits appear instantly with no refresh. No rendering logic lives here.
 */
export function EditorForm() {
  const p = useProjectStore((s) => s.current);
  const updateSceneContent = useProjectStore((s) => s.updateSceneContent);
  const updateSceneMeta = useProjectStore((s) => s.updateSceneMeta);
  const clearScene = useProjectStore((s) => s.clearScene);
  const updateBranding = useProjectStore((s) => s.updateBranding);
  const updateTicker = useProjectStore((s) => s.updateTicker);
  const setTickerItems = useProjectStore((s) => s.setTickerItems);
  const updateMedia = useProjectStore((s) => s.updateMedia);
  const updateSceneMedia = useProjectStore((s) => s.updateSceneMedia);
  const updateAudio = useProjectStore((s) => s.updateAudio);
  const updateScenes = useProjectStore((s) => s.updateScenes);
  const updateSettings = useProjectStore((s) => s.updateSettings);
  const setName = useProjectStore((s) => s.setName);

  const activeScene = p.storyScenes.find((sc) => sc.id === p.activeSceneId) ?? p.storyScenes[0];
  const sceneNumber = p.storyScenes.findIndex((sc) => sc.id === activeScene?.id) + 1;

  return (
    <div className="scrollable space-y-1 pr-2 lg:h-full lg:overflow-y-auto">
      <Field label="Project name">
        <Input value={p.name} onChange={(e) => setName(e.target.value)} />
      </Field>

      {/* ---------- Template (per active scene) ---------- */}
      <SectionTitle>Template · Scene {sceneNumber}</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATE_LIST.map((t) => (
          <button
            key={t.id}
            onClick={() => updateSceneMeta({ templateId: t.id })}
            className={`rounded-md border p-3 text-left text-sm transition-colors ${
              p.settings.templateId === t.id
                ? "border-accent-soft bg-surface-raised text-white"
                : "border-surface-border text-slate-400 hover:border-slate-600"
            }`}
          >
            <div className="font-bold">{t.name}</div>
          </button>
        ))}
      </div>

      {/* ---------- News content (per active scene) ---------- */}
      <div className="flex items-center justify-between">
        <SectionTitle>News Content · Scene {sceneNumber}</SectionTitle>
        <button
          onClick={() => {
            if (activeScene && window.confirm(`Clear all content of "${activeScene.name}"? This can't be undone.`)) {
              clearScene(activeScene.id);
            }
          }}
          className="rounded-md border border-surface-border px-2.5 py-1 text-xs font-semibold text-slate-400 hover:border-accent-soft hover:text-accent-soft"
          title="Reset this scene's content to blank"
        >
          ⟲ Clear scene
        </button>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Scene name">
            <Input value={activeScene?.name ?? ""} onChange={(e) => updateSceneMeta({ name: e.target.value })} />
          </Field>
          <Field label="Duration (s)">
            <Input
              type="number"
              min={0.5}
              step={0.5}
              value={activeScene?.durationSeconds ?? 6}
              onChange={(e) => updateSceneMeta({ durationSeconds: num(e.target.value, 0.5) })}
            />
          </Field>
        </div>
        <Field label="Headline">
          <Textarea rows={2} value={p.content.headline} onChange={(e) => updateSceneContent({ headline: e.target.value })} />
        </Field>
        <Field label="Subtitle">
          <Input value={p.content.subtitle} onChange={(e) => updateSceneContent({ subtitle: e.target.value })} />
        </Field>
        <Field label="Description">
          <Textarea
            rows={4}
            value={p.content.description}
            onChange={(e) => updateSceneContent({ description: e.target.value })}
          />
        </Field>
      </div>

      {/* ---------- Media ---------- */}
      <SectionTitle>Media</SectionTitle>
      <div className="space-y-2">
        <MediaUpload label="Logo (all scenes)" accept="image/*" kind="logo" value={p.media.logo} onChange={(v) => updateMedia({ logo: v })} />
        <BackgroundSlidesPanel />
        <MediaUpload
          label={`Background Image · Scene ${sceneNumber}`}
          accept="image/*"
          kind="image"
          value={activeScene?.media?.backgroundImage}
          onChange={(v) => updateSceneMedia({ backgroundImage: v })}
        />
        <MediaUpload
          label={`Background Video · Scene ${sceneNumber}`}
          accept="video/*"
          kind="video"
          value={activeScene?.media?.backgroundVideo}
          onChange={(v) => updateSceneMedia({ backgroundVideo: v })}
          preview={false}
        />
        <MediaUpload
          label="Thumbnail"
          accept="image/*"
          kind="image"
          value={p.media.thumbnail}
          onChange={(v) => updateMedia({ thumbnail: v })}
        />
        <MediaUpload
          label="Background Music"
          accept="audio/*"
          kind="audio"
          value={p.media.backgroundMusic}
          onChange={(v) => updateMedia({ backgroundMusic: v })}
          preview={false}
        />
        <MediaUpload
          label="Intro Music"
          accept="audio/*"
          kind="audio"
          value={p.media.introMusic}
          onChange={(v) => updateMedia({ introMusic: v })}
          preview={false}
        />
        <MediaUpload
          label="Outro Music"
          accept="audio/*"
          kind="audio"
          value={p.media.outroMusic}
          onChange={(v) => updateMedia({ outroMusic: v })}
          preview={false}
        />
      </div>

      {/* ---------- Branding ---------- */}
      <SectionTitle>Branding</SectionTitle>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Channel name">
            <Input value={p.branding.channelName} onChange={(e) => updateBranding({ channelName: e.target.value })} />
          </Field>
          <Field label="Watermark">
            <Input value={p.branding.watermark} onChange={(e) => updateBranding({ watermark: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary color">
            <ColorInput value={p.branding.primaryColor} onChange={(v) => updateBranding({ primaryColor: v })} />
          </Field>
          <Field label="Secondary color">
            <ColorInput value={p.branding.secondaryColor} onChange={(v) => updateBranding({ secondaryColor: v })} />
          </Field>
        </div>
        <Field label="Font">
          <Select value={p.branding.fontFamily} onChange={(e) => updateBranding({ fontFamily: e.target.value })}>
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {FONT_LABELS[f] ?? f.split(",")[0].replace(/'/g, "")}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* ---------- Scenes / Timeline ---------- */}
      <SectionTitle>Scenes &amp; Timeline</SectionTitle>
      <div className="space-y-3">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={p.scenes.includeIntro}
              onChange={(e) => updateScenes({ includeIntro: e.target.checked })}
            />
            Intro scene
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={p.scenes.includeOutro}
              onChange={(e) => updateScenes({ includeOutro: e.target.checked })}
            />
            Outro scene
          </label>
        </div>
        <p className="text-xs text-slate-500">
          Each scene&apos;s length is set per scene (on the timeline bar above the preview). Intro &amp; outro wrap the whole story.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Intro (s)">
            <Input
              type="number"
              value={p.scenes.introSeconds}
              onChange={(e) => updateScenes({ introSeconds: num(e.target.value, 0.5) })}
            />
          </Field>
          <Field label="Outro (s)">
            <Input
              type="number"
              value={p.scenes.outroSeconds}
              onChange={(e) => updateScenes({ outroSeconds: num(e.target.value, 0.5) })}
            />
          </Field>
          <Field label="Transition">
            <Select
              value={p.scenes.transition}
              onChange={(e) => updateScenes({ transition: e.target.value as (typeof TRANSITIONS)[number] })}
            >
              {TRANSITIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Transition (s)">
            <Input
              type="number"
              step="0.1"
              value={p.scenes.transitionSeconds}
              onChange={(e) => updateScenes({ transitionSeconds: num(e.target.value, 0) })}
            />
          </Field>
        </div>
      </div>

      {/* ---------- Anchors ---------- */}
      <SectionTitle>Anchors</SectionTitle>
      <AnchorPanel />

      {/* ---------- Ticker ---------- */}
      <SectionTitle>News Ticker</SectionTitle>
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={p.ticker.enabled}
            onChange={(e) => updateTicker({ enabled: e.target.checked })}
          />
          Enable scrolling ticker
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Label">
            <Input value={p.ticker.label} onChange={(e) => updateTicker({ label: e.target.value })} />
          </Field>
          <Field label="Speed (px/s)">
            <Input
              type="number"
              value={p.ticker.speed}
              onChange={(e) => updateTicker({ speed: num(e.target.value, 0) })}
            />
          </Field>
        </div>
        <Field
          label="Ticker items (fallback)"
          hint="The ticker scrolls each scene's Description automatically. These lines are used only when no description is written."
        >
          <Textarea
            rows={3}
            value={p.ticker.items.join("\n")}
            onChange={(e) => setTickerItems(e.target.value.split("\n").filter((l) => l.trim() !== ""))}
          />
        </Field>
      </div>

      {/* ---------- Audio ---------- */}
      <SectionTitle>Audio</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <SliderField
          label="Master volume"
          value={p.audio.masterVolume}
          onChange={(v) => updateAudio({ masterVolume: v })}
        />
        <SliderField label="Music volume" value={p.audio.musicVolume} onChange={(v) => updateAudio({ musicVolume: v })} />
        <Field label="Fade in (s)">
          <Input
            type="number"
            step="0.1"
            value={p.audio.fadeInSeconds}
            onChange={(e) => updateAudio({ fadeInSeconds: num(e.target.value, 0) })}
          />
        </Field>
        <Field label="Fade out (s)">
          <Input
            type="number"
            step="0.1"
            value={p.audio.fadeOutSeconds}
            onChange={(e) => updateAudio({ fadeOutSeconds: num(e.target.value, 0) })}
          />
        </Field>
      </div>

      {/* ---------- Output ---------- */}
      <SectionTitle>Output</SectionTitle>
      <div className="grid grid-cols-2 gap-3 pb-6">
        <Field label="Resolution">
          <Select
            value={p.settings.resolution}
            onChange={(e) => updateSettings({ resolution: e.target.value as Resolution })}
          >
            <option value="720p">720p (HD)</option>
            <option value="1080p">1080p (Full HD)</option>
            <option value="1440p">1440p (2K QHD)</option>
            <option value="2160p">2160p (4K UHD)</option>
          </Select>
        </Field>
        <Field label="Aspect ratio">
          <Select
            value={p.settings.aspectRatio}
            onChange={(e) => updateSettings({ aspectRatio: e.target.value as AspectRatio })}
          >
            {ASPECTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="FPS">
          <Select value={p.settings.fps} onChange={(e) => updateSettings({ fps: Number(e.target.value) as Fps })}>
            <option value={30}>30</option>
            <option value={60}>60</option>
          </Select>
        </Field>
        <Field label="Format">
          <Select value={p.settings.format} onChange={(e) => updateSettings({ format: e.target.value as VideoFormat })}>
            <option value="mp4">MP4 (H.264)</option>
            <option value="webm">WebM (VP8)</option>
          </Select>
        </Field>
      </div>
    </div>
  );
}

function num(v: string, min: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, n) : min;
}

/** Color swatch + hex text input pair. */
function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-10 cursor-pointer rounded border border-surface-border bg-surface"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** 0..1 volume slider with a readout. */
function SliderField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={`${label} — ${Math.round(value * 100)}%`}>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </Field>
  );
}
