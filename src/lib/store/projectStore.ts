"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "./idbStorage";
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
  StoryScene,
  SceneMedia,
  SocialConfig,
  AudioClip,
} from "@/types/project";
import { PROJECT_VERSION } from "@/types/project";
import type { AnchorInstance } from "@/anchors/types";
import { createDefaultProject, createStoryScene, createBlankContent } from "@/lib/defaults";

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
  /** Project-level media (logo, music, watermark, thumbnail). */
  updateMedia: (patch: Partial<MediaAssets>) => void;

  // --- per-scene background media (applies to the ACTIVE scene) ---
  updateSceneMedia: (patch: Partial<SceneMedia>) => void;
  addBackgroundSlide: (slide: BackgroundSlide) => void;
  updateBackgroundSlide: (id: string, patch: Partial<BackgroundSlide>) => void;
  removeBackgroundSlide: (id: string) => void;
  reorderBackgroundSlide: (id: string, direction: -1 | 1) => void;

  updateAudio: (patch: Partial<AudioSettings>) => void;
  updateSocial: (patch: Partial<SocialConfig>) => void;

  // --- audio timeline ---
  addAudioClip: (clip: AudioClip) => void;
  updateAudioClip: (id: string, patch: Partial<AudioClip>) => void;
  removeAudioClip: (id: string) => void;
  updateScenes: (patch: Partial<SceneConfig>) => void;
  updateSettings: (patch: Partial<VideoSettings>) => void;
  setTickerItems: (items: string[]) => void;

  // --- story timeline (multi-scene) ---
  selectScene: (id: string) => void;
  addScene: () => void;
  removeScene: (id: string) => void;
  reorderScene: (id: string, direction: -1 | 1) => void;
  /** Patch the ACTIVE scene's editorial content. */
  updateSceneContent: (patch: Partial<NewsContent>) => void;
  /** Patch the ACTIVE scene's metadata (name / template / duration). */
  updateSceneMeta: (patch: Partial<Pick<StoryScene, "name" | "templateId" | "durationSeconds">>) => void;
  /** Wipe one scene's editorial content back to blank (keeps template/duration/name). */
  clearScene: (id: string) => void;

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
 * Keep the legacy `content` + `settings.templateId` in sync with the active
 * scene. Intro/outro scenes, the persistent themed background, and any code
 * still reading `project.content` all follow whatever scene is being edited.
 */
function mirrorActive(p: NewsProject): NewsProject {
  const active = p.storyScenes.find((s) => s.id === p.activeSceneId) ?? p.storyScenes[0];
  if (!active) return p;
  return { ...p, content: active.content, settings: { ...p.settings, templateId: active.templateId } };
}

/**
 * A scene with a slideshow lasts as long as its LONGER layer (base slides play
 * in sequence; overlay slides play in their own sequence on top). Falls back to
 * the scene's own duration when there are no slides.
 */
function sceneDurationFromSlides(slides: BackgroundSlide[] | undefined, fallback: number): number {
  const safeFallback = Number.isFinite(fallback) && fallback > 0 ? fallback : 6;
  const list = slides ?? [];
  if (list.length === 0) return safeFallback;
  const totalFor = (layer: "base" | "overlay") =>
    list
      .filter((s) => (s.layer ?? "base") === layer)
      .reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0);
  return Math.max(0.5, totalFor("base"), totalFor("overlay"));
}

/**
 * Immutably patch the ACTIVE scene's media and re-mirror. When the scene has a
 * background slideshow, the scene's duration is auto-set to the longer layer's
 * total (so the video length always matches the media).
 */
function patchActiveMedia(p: NewsProject, fn: (m: SceneMedia) => SceneMedia): NewsProject {
  const storyScenes = p.storyScenes.map((sc) => {
    if (sc.id !== p.activeSceneId) return sc;
    const media = fn(sc.media ?? {});
    const durationSeconds = sceneDurationFromSlides(media.backgroundSlides, sc.durationSeconds);
    return { ...sc, media, durationSeconds };
  });
  return mirrorActive({ ...p, storyScenes });
}

/**
 * Backfill any missing fields on a project loaded from an older schema so that
 * save/load restores a project exactly and forward-compatibly. Existing values
 * always win over the defaults.
 */
export function migrateProject(input: Partial<NewsProject>): NewsProject {
  const d = createDefaultProject(input.createdAt ?? new Date().toISOString());
  const merged: NewsProject = {
    ...d,
    ...input,
    version: PROJECT_VERSION,
    content: { ...d.content, ...input.content },
    media: { ...d.media, ...input.media },
    branding: { ...d.branding, ...input.branding },
    ticker: { ...d.ticker, ...input.ticker },
    audio: { ...d.audio, ...input.audio },
    audioClips: ((input.audioClips ?? d.audioClips) as Partial<AudioClip>[]).map((c) => ({
      lane: 0,
      loop: false,
      muted: false,
      sourceDurationSeconds: c.durationSeconds ?? 0,
      ...c,
    })) as AudioClip[],
    social: { ...d.social, ...input.social },
    scenes: { ...d.scenes, ...input.scenes },
    anchors: input.anchors ?? d.anchors,
    settings: { ...d.settings, ...input.settings },
    storyScenes: d.storyScenes, // replaced below
    activeSceneId: d.activeSceneId,
  };

  // Backfill the story timeline. Pre-v5 projects had a single `content` +
  // `settings.templateId`; turn that into a one-scene timeline. Pre-v6 scenes had
  // no per-scene media, and background imagery lived on the project — carry that
  // into the first scene so nothing visually disappears on upgrade.
  const legacyBg: SceneMedia = {
    backgroundImage: merged.media.backgroundImage,
    backgroundVideo: merged.media.backgroundVideo,
    backgroundSlides: merged.media.backgroundSlides,
  };
  const rawScenes =
    input.storyScenes && input.storyScenes.length > 0
      ? input.storyScenes
      : [createStoryScene("Scene 1", merged.content, merged.settings.templateId, merged.scenes.headlineSeconds || 6, legacyBg)];
  const scenes = rawScenes.map((sc, i) => {
    // Ensure every scene has its own media; give the first scene any legacy
    // project-level background if it has none of its own.
    const media = sc.media ?? (i === 0 ? legacyBg : {});
    // Keep scene duration in sync with its slideshow (longer of base/overlay).
    const durationSeconds = sceneDurationFromSlides(media.backgroundSlides, sc.durationSeconds);
    return { ...sc, media, durationSeconds };
  });
  merged.storyScenes = scenes;
  merged.activeSceneId =
    input.activeSceneId && scenes.some((s) => s.id === input.activeSceneId)
      ? input.activeSceneId
      : scenes[0].id;

  return mirrorActive(merged);
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

      // --- per-scene background media (ACTIVE scene) ---
      updateSceneMedia: (patch) =>
        set((s) => ({ current: touch(patchActiveMedia(s.current, (m) => ({ ...m, ...patch }))) })),
      addBackgroundSlide: (slide) =>
        set((s) => ({
          current: touch(patchActiveMedia(s.current, (m) => ({ ...m, backgroundSlides: [...(m.backgroundSlides ?? []), slide] }))),
        })),
      updateBackgroundSlide: (id, patch) =>
        set((s) => ({
          current: touch(
            patchActiveMedia(s.current, (m) => ({
              ...m,
              backgroundSlides: (m.backgroundSlides ?? []).map((sl) => (sl.id === id ? { ...sl, ...patch } : sl)),
            })),
          ),
        })),
      removeBackgroundSlide: (id) =>
        set((s) => ({
          current: touch(
            patchActiveMedia(s.current, (m) => ({
              ...m,
              backgroundSlides: (m.backgroundSlides ?? []).filter((sl) => sl.id !== id),
            })),
          ),
        })),
      reorderBackgroundSlide: (id, direction) =>
        set((s) => {
          const active = s.current.storyScenes.find((sc) => sc.id === s.current.activeSceneId);
          const arr = [...(active?.media?.backgroundSlides ?? [])];
          const i = arr.findIndex((sl) => sl.id === id);
          const j = i + direction;
          if (i < 0 || j < 0 || j >= arr.length) return {};
          [arr[i], arr[j]] = [arr[j], arr[i]];
          return { current: touch(patchActiveMedia(s.current, (m) => ({ ...m, backgroundSlides: arr }))) };
        }),
      updateAudio: (patch) =>
        set((s) => ({ current: touch({ ...s.current, audio: { ...s.current.audio, ...patch } }) })),
      updateSocial: (patch) =>
        set((s) => ({ current: touch({ ...s.current, social: { ...s.current.social, ...patch } }) })),

      addAudioClip: (clip) =>
        set((s) => ({ current: touch({ ...s.current, audioClips: [...s.current.audioClips, clip] }) })),
      updateAudioClip: (id, patch) =>
        set((s) => ({
          current: touch({
            ...s.current,
            audioClips: s.current.audioClips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          }),
        })),
      removeAudioClip: (id) =>
        set((s) => ({
          current: touch({ ...s.current, audioClips: s.current.audioClips.filter((c) => c.id !== id) }),
        })),
      updateScenes: (patch) =>
        set((s) => ({ current: touch({ ...s.current, scenes: { ...s.current.scenes, ...patch } }) })),
      updateSettings: (patch) =>
        set((s) => ({ current: touch({ ...s.current, settings: { ...s.current.settings, ...patch } }) })),
      setTickerItems: (items) =>
        set((s) => ({ current: touch({ ...s.current, ticker: { ...s.current.ticker, items } }) })),

      // --- story timeline ---
      selectScene: (id) =>
        set((s) => {
          if (!s.current.storyScenes.some((sc) => sc.id === id)) return {};
          return { current: touch(mirrorActive({ ...s.current, activeSceneId: id })) };
        }),
      addScene: () =>
        set((s) => {
          const n = s.current.storyScenes.length + 1;
          // New scenes start blank so the user fills them in, but inherit the
          // active scene's template + duration as a sensible starting point.
          const active = s.current.storyScenes.find((sc) => sc.id === s.current.activeSceneId);
          const scene = createStoryScene(
            `Scene ${n}`,
            createBlankContent(),
            active?.templateId ?? s.current.settings.templateId,
            active?.durationSeconds ?? 6,
          );
          return {
            current: touch(
              mirrorActive({
                ...s.current,
                storyScenes: [...s.current.storyScenes, scene],
                activeSceneId: scene.id,
              }),
            ),
          };
        }),
      removeScene: (id) =>
        set((s) => {
          const remaining = s.current.storyScenes.filter((sc) => sc.id !== id);
          // Always keep at least one scene.
          const scenes = remaining.length > 0 ? remaining : [createStoryScene("Scene 1", createBlankContent())];
          const activeSceneId = scenes.some((sc) => sc.id === s.current.activeSceneId)
            ? s.current.activeSceneId
            : scenes[0].id;
          return { current: touch(mirrorActive({ ...s.current, storyScenes: scenes, activeSceneId })) };
        }),
      reorderScene: (id, direction) =>
        set((s) => {
          const arr = [...s.current.storyScenes];
          const i = arr.findIndex((sc) => sc.id === id);
          const j = i + direction;
          if (i < 0 || j < 0 || j >= arr.length) return {};
          [arr[i], arr[j]] = [arr[j], arr[i]];
          return { current: touch({ ...s.current, storyScenes: arr }) };
        }),
      updateSceneContent: (patch) =>
        set((s) => {
          const scenes = s.current.storyScenes.map((sc) =>
            sc.id === s.current.activeSceneId ? { ...sc, content: { ...sc.content, ...patch } } : sc,
          );
          return { current: touch(mirrorActive({ ...s.current, storyScenes: scenes })) };
        }),
      updateSceneMeta: (patch) =>
        set((s) => {
          const scenes = s.current.storyScenes.map((sc) =>
            sc.id === s.current.activeSceneId ? { ...sc, ...patch } : sc,
          );
          return { current: touch(mirrorActive({ ...s.current, storyScenes: scenes })) };
        }),
      clearScene: (id) =>
        set((s) => {
          const scenes = s.current.storyScenes.map((sc) =>
            sc.id === id ? { ...sc, content: createBlankContent() } : sc,
          );
          return { current: touch(mirrorActive({ ...s.current, storyScenes: scenes })) };
        }),

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
      // IndexedDB (not localStorage) so large media libraries don't hit the ~5 MB
      // localStorage quota — users can save unlimited scenes/media and export freely.
      // Async storage; `useMounted()` already gates persisted-state rendering.
      storage: createJSONStorage(() => idbStorage),
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
