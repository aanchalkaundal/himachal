/**
 * Core domain model for the News Video Generator.
 *
 * A `NewsProject` is the single source of truth for the whole app: the editor
 * mutates it, the live preview reads it, and the renderer serializes it as
 * Remotion `inputProps`. Keep this file free of React/Remotion imports so it
 * can be shared by client, server, and worker code alike.
 */

export type TemplateId =
  | "breaking-news"
  | "modern-news"
  | "business-news"
  | "minimal-news"
  | "cinematic-prime"
  | "live-bulletin"
  | "data-pulse"
  | "sports-spotlight";

export type Resolution = "720p" | "1080p" | "1440p" | "2160p";
export type Fps = 30 | 60;
export type AspectRatio = "16:9" | "9:16" | "1:1";
export type VideoFormat = "mp4" | "webm";

// Anchor instances are defined by the Anchor Engine; imported as a type only to
// avoid coupling this model to any anchor implementation.
import type { AnchorInstance } from "@/anchors/types";

/** Editorial text content of a news video. */
export interface NewsContent {
  headline: string;
  subtitle: string;
  description: string;
  category: string;
  reporter: string;
  location: string;
  /** ISO date string, e.g. "2026-07-08". */
  date: string;
  /** 24h "HH:mm" local time string. */
  time: string;
}

/**
 * A single background image in the slideshow. Each slide is shown for
 * `durationSeconds`, then the show advances (and loops across the whole video).
 * The image performs a Ken Burns zoom toward the focal point at `zoomSpeed`.
 */
export interface BackgroundSlide {
  id: string;
  /** Image data/object URL. */
  src: string;
  /** How long this image stays on screen, in seconds. */
  durationSeconds: number;
  /** Zoom focal point as viewport percentages (0..100). The image scales toward here. */
  focalX: number;
  focalY: number;
  /**
   * Zoom amount per second, as a percentage. e.g. 10 → +10% scale each second
   * (so a 5s slide ends at 1.5×). 0 = no zoom (static). Negative = zoom out.
   */
  zoomSpeed: number;
}

/**
 * Per-scene visual background. Kept separate from project-level MediaAssets so
 * each scene owns its own imagery — removing a scene's image never touches
 * another scene. (Logo, music, watermark stay project-level / channel-wide.)
 */
export interface SceneMedia {
  backgroundImage?: string;
  backgroundVideo?: string;
  /** Per-scene background slideshow (multi-image with zoom). */
  backgroundSlides?: BackgroundSlide[];
}

/**
 * One user-authored scene on the story timeline. A project is an ordered list of
 * these; the renderer plays them back-to-back into a single video. Each scene has
 * its own template, editorial content, and background media, so a project can mix
 * looks (e.g. a Breaking-News opener, a Business segment, a Sports closer).
 */
export interface StoryScene {
  id: string;
  /** Short label shown on the timeline bar (e.g. "Scene 1"). */
  name: string;
  /** Template used to render this scene's foreground. */
  templateId: TemplateId;
  /** How long this scene runs, in seconds. */
  durationSeconds: number;
  /** This scene's editorial content. */
  content: NewsContent;
  /** This scene's own background imagery. */
  media: SceneMedia;
}

/**
 * Uploaded media. Values are browser object/data URLs in the editor and are
 * passed straight to the renderer as inputProps (Remotion loads data URLs).
 */
export interface MediaAssets {
  logo?: string;
  thumbnail?: string;
  backgroundImage?: string;
  backgroundVideo?: string;
  /**
   * Ordered background slideshow. When non-empty this takes precedence over a
   * single `backgroundImage` (but a `backgroundVideo` still wins over both).
   */
  backgroundSlides?: BackgroundSlide[];
  backgroundMusic?: string;
  introMusic?: string;
  outroMusic?: string;
}

/** Channel-level branding applied on top of any template. */
export interface Branding {
  channelName: string;
  watermark: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

/** Editable scrolling ticker along the bottom of the frame. */
export interface TickerConfig {
  enabled: boolean;
  label: string;
  items: string[];
  /** Pixels/second scroll speed. */
  speed: number;
}

/** Audio mixing settings. Volumes are 0..1; fades are in seconds. */
export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
}

/**
 * Scene configuration. The timeline engine expands these flags + content into
 * a concrete list of scenes; per-scene durations are in seconds. Designed so
 * future full timeline editing can add explicit scene records without changing
 * the renderer.
 */
export interface SceneConfig {
  includeIntro: boolean;
  includeOutro: boolean;
  introSeconds: number;
  headlineSeconds: number;
  /** Seconds allotted to each body paragraph. */
  bodySecondsPerParagraph: number;
  outroSeconds: number;
  /** Cross-scene transition style. */
  transition: "fade" | "slide" | "wipe" | "none";
  /** Transition duration in seconds. */
  transitionSeconds: number;
}

/** Output/render settings. */
export interface VideoSettings {
  templateId: TemplateId;
  resolution: Resolution;
  aspectRatio: AspectRatio;
  fps: Fps;
  format: VideoFormat;
}

/** A complete, self-contained news video project. */
export interface NewsProject {
  /** Schema version for forward-compatible migrations. */
  version: number;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  content: NewsContent;
  media: MediaAssets;
  branding: Branding;
  ticker: TickerConfig;
  audio: AudioSettings;
  scenes: SceneConfig;
  /**
   * The story timeline: an ordered list of user-authored scenes rendered
   * back-to-back. Always has at least one scene. `content`/`settings.templateId`
   * mirror the active scene for backward compatibility and the persistent
   * background look.
   */
  storyScenes: StoryScene[];
  /** Id of the scene currently being edited / previewed in the form. */
  activeSceneId: string;
  /** Placed anchors (Anchor Engine). Empty by default. */
  anchors: AnchorInstance[];
  settings: VideoSettings;
}

/** Current project schema version. */
export const PROJECT_VERSION = 6;

/**
 * Base long/short edge (px) per resolution, on a 16:9 grid. Actual width/height
 * are derived by applying the aspect ratio in `getDimensions`. 1440p = QHD (2K),
 * 2160p = UHD (4K); both keep even dimensions across every aspect ratio, which
 * H.264/VP8 encoders require.
 */
const BASE_EDGES: Record<Resolution, { long: number; short: number }> = {
  "720p": { long: 1280, short: 720 },
  "1080p": { long: 1920, short: 1080 },
  "1440p": { long: 2560, short: 1440 },
  "2160p": { long: 3840, short: 2160 },
};

/** Compute concrete pixel dimensions for a resolution + aspect ratio (16:9 base). */
export function getDimensions(resolution: Resolution, aspect: AspectRatio): { width: number; height: number } {
  const { long, short } = BASE_EDGES[resolution];
  switch (aspect) {
    case "16:9":
      return { width: long, height: short };
    case "9:16":
      return { width: short, height: long };
    case "1:1":
      return { width: short, height: short };
  }
}
