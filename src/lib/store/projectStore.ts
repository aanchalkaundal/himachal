"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  NewsProject,
  NewsContent,
  Branding,
  TickerConfig,
  MediaAssets,
  VideoSettings,
  AudioSettings,
  SceneConfig,
  BackgroundSlide,
} from "@/types/project";
import { PROJECT_VERSION } from "@/types/project";
import type { AnchorInstance } from "@/anchors/types";
import { createDefaultProject } from "@/lib/defaults";

interface ProjectState {
  /** The project currently open in the editor. */
  current: NewsProject;
  /** Persisted library of saved projects. */
  saved: NewsProject[];

  // --- current-project mutations (drive the live preview) ---
  newProject: () => void;
  loadProject: (id: string) => void;
  setName: (name: string) => void;
  updateContent: (patch: Partial<NewsContent>) => void;
  updateBranding: (patch: Partial<Branding>) => void;
  updateTicker: (patch: Partial<TickerConfig>) => void;
  updateMedia: (patch: Partial<MediaAssets>) => void;

  // --- background slideshow ---
  addBackgroundSlide: (slide: BackgroundSlide) => void;
  updateBackgroundSlide: (id: string, patch: Partial<BackgroundSlide>) => void;
  removeBackgroundSlide: (id: string) => void;
  reorderBackgroundSlide: (id: string, direction: -1 | 1) => void;

  updateAudio: (patch: Partial<AudioSettings>) => void;
  updateScenes: (patch: Partial<SceneConfig>) => void;
  updateSettings: (patch: Partial<VideoSettings>) => void;
  setTickerItems: (items: string[]) => void;

  // --- anchors (Anchor Engine) ---
  addAnchor: (instance: AnchorInstance) => void;
  updateAnchor: (instanceId: string, patch: Partial<AnchorInstance>) => void;
  removeAnchor: (instanceId: string) => void;
  reorderAnchor: (instanceId: string, direction: -1 | 1) => void;

  // --- library ---
  saveCurrent: () => void;
  deleteProject: (id: string) => void;
}

function touch(p: NewsProject): NewsProject {
  return { ...p, updatedAt: new Date().toISOString() };
}

/**
 * Backfill any missing fields on a project loaded from an older schema so that
 * save/load restores a project exactly and forward-compatibly. Existing values
 * always win over the defaults.
 */
export function migrateProject(input: Partial<NewsProject>): NewsProject {
  const d = createDefaultProject(input.createdAt ?? new Date().toISOString());
  return {
    ...d,
    ...input,
    version: PROJECT_VERSION,
    content: { ...d.content, ...input.content },
    media: { ...d.media, ...input.media },
    branding: { ...d.branding, ...input.branding },
    ticker: { ...d.ticker, ...input.ticker },
    audio: { ...d.audio, ...input.audio },
    scenes: { ...d.scenes, ...input.scenes },
    anchors: input.anchors ?? d.anchors,
    settings: { ...d.settings, ...input.settings },
  };
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      current: createDefaultProject(),
      saved: [],

      newProject: () => set({ current: createDefaultProject() }),

      loadProject: (id) => {
        const found = get().saved.find((p) => p.id === id);
        if (found) set({ current: migrateProject(structuredClone(found)) });
      },

      setName: (name) => set((s) => ({ current: touch({ ...s.current, name }) })),

      updateContent: (patch) =>
        set((s) => ({ current: touch({ ...s.current, content: { ...s.current.content, ...patch } }) })),
      updateBranding: (patch) =>
        set((s) => ({ current: touch({ ...s.current, branding: { ...s.current.branding, ...patch } }) })),
      updateTicker: (patch) =>
        set((s) => ({ current: touch({ ...s.current, ticker: { ...s.current.ticker, ...patch } }) })),
      updateMedia: (patch) =>
        set((s) => ({ current: touch({ ...s.current, media: { ...s.current.media, ...patch } }) })),

      addBackgroundSlide: (slide) =>
        set((s) => ({
          current: touch({
            ...s.current,
            media: { ...s.current.media, backgroundSlides: [...(s.current.media.backgroundSlides ?? []), slide] },
          }),
        })),
      updateBackgroundSlide: (id, patch) =>
        set((s) => ({
          current: touch({
            ...s.current,
            media: {
              ...s.current.media,
              backgroundSlides: (s.current.media.backgroundSlides ?? []).map((sl) =>
                sl.id === id ? { ...sl, ...patch } : sl,
              ),
            },
          }),
        })),
      removeBackgroundSlide: (id) =>
        set((s) => ({
          current: touch({
            ...s.current,
            media: {
              ...s.current.media,
              backgroundSlides: (s.current.media.backgroundSlides ?? []).filter((sl) => sl.id !== id),
            },
          }),
        })),
      reorderBackgroundSlide: (id, direction) =>
        set((s) => {
          const arr = [...(s.current.media.backgroundSlides ?? [])];
          const i = arr.findIndex((sl) => sl.id === id);
          const j = i + direction;
          if (i < 0 || j < 0 || j >= arr.length) return {};
          [arr[i], arr[j]] = [arr[j], arr[i]];
          return { current: touch({ ...s.current, media: { ...s.current.media, backgroundSlides: arr } }) };
        }),
      updateAudio: (patch) =>
        set((s) => ({ current: touch({ ...s.current, audio: { ...s.current.audio, ...patch } }) })),
      updateScenes: (patch) =>
        set((s) => ({ current: touch({ ...s.current, scenes: { ...s.current.scenes, ...patch } }) })),
      updateSettings: (patch) =>
        set((s) => ({ current: touch({ ...s.current, settings: { ...s.current.settings, ...patch } }) })),
      setTickerItems: (items) =>
        set((s) => ({ current: touch({ ...s.current, ticker: { ...s.current.ticker, items } }) })),

      addAnchor: (instance) =>
        set((s) => ({ current: touch({ ...s.current, anchors: [...s.current.anchors, instance] }) })),
      updateAnchor: (instanceId, patch) =>
        set((s) => ({
          current: touch({
            ...s.current,
            anchors: s.current.anchors.map((a) => (a.instanceId === instanceId ? { ...a, ...patch } : a)),
          }),
        })),
      removeAnchor: (instanceId) =>
        set((s) => ({
          current: touch({ ...s.current, anchors: s.current.anchors.filter((a) => a.instanceId !== instanceId) }),
        })),
      reorderAnchor: (instanceId, direction) =>
        set((s) => {
          const arr = [...s.current.anchors];
          const i = arr.findIndex((a) => a.instanceId === instanceId);
          const j = i + direction;
          if (i < 0 || j < 0 || j >= arr.length) return {};
          [arr[i], arr[j]] = [arr[j], arr[i]];
          return { current: touch({ ...s.current, anchors: arr }) };
        }),

      saveCurrent: () =>
        set((s) => {
          const saved = touch(s.current);
          const idx = s.saved.findIndex((p) => p.id === saved.id);
          const list = idx >= 0 ? s.saved.map((p, i) => (i === idx ? saved : p)) : [...s.saved, saved];
          return { saved: list, current: saved };
        }),

      deleteProject: (id) => set((s) => ({ saved: s.saved.filter((p) => p.id !== id) })),
    }),
    {
      name: "nvg-store-v2",
      version: PROJECT_VERSION,
      storage: createJSONStorage(() => localStorage),
      // Persist the whole library (including media data URLs) so a saved project
      // reloads exactly. The working `current` project is ephemeral.
      partialize: (s) => ({ saved: s.saved }),
      migrate: (persisted) => {
        const p = persisted as { saved?: Partial<NewsProject>[] } | undefined;
        return { saved: (p?.saved ?? []).map(migrateProject) };
      },
    },
  ),
);
