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

export type Resolution = "720p" | "1080p";
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
 * Uploaded media. Values are browser object/data URLs in the editor and are
 * passed straight to the renderer as inputProps (Remotion loads data URLs).
 */
export interface MediaAssets {
  logo?: string;
  thumbnail?: string;
  backgroundImage?: string;
  backgroundVideo?: string;
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
  /** Placed anchors (Anchor Engine). Empty by default. */
  anchors: AnchorInstance[];
  settings: VideoSettings;
}

/** Current project schema version. */
export const PROJECT_VERSION = 3;

/**
 * Base pixel size (long edge) per resolution. Actual width/height are derived
 * by applying the aspect ratio in `getDimensions`.
 */
const BASE_LONG_EDGE: Record<Resolution, number> = {
  "720p": 1280,
  "1080p": 1920,
};

/** Compute concrete pixel dimensions for a resolution + aspect ratio (16:9 base). */
export function getDimensions(resolution: Resolution, aspect: AspectRatio): { width: number; height: number } {
  const longEdge = BASE_LONG_EDGE[resolution];
  const shortEdge = resolution === "720p" ? 720 : 1080;
  switch (aspect) {
    case "16:9":
      return { width: longEdge, height: shortEdge };
    case "9:16":
      return { width: shortEdge, height: longEdge };
    case "1:1":
      return { width: shortEdge, height: shortEdge };
  }
}
