/**
 * Core domain model for the News Video Generator.
 *
 * A `NewsProject` is the single source of truth for the whole app: the editor
 * mutates it, the live preview reads it, and the renderer serializes it as
 * Remotion `inputProps`. Keep this file free of React/Remotion imports so it
 * can be shared by client, server, and worker code alike.
 */

export type TemplateId =
  | "none"
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
  /** "image" (default), "video", or "text" (a typed on-screen card). */
  kind?: "image" | "video" | "text";
  /**
   * Compositing layer: "base" (default) plays in the background; "overlay" plays
   * ON TOP of the base — useful for a green-screen-removed subject over a
   * background. Base and overlay each run as their own sequence.
   */
  layer?: "base" | "overlay";
  /** Image or video data/object URL (empty for a text card). */
  src: string;

  // --- text card fields (kind === "text") ---
  /** The typed text to show. */
  text?: string;
  /** Text color (default white). */
  textColor?: string;
  /** Card background color; "transparent" shows the media/gradient behind. */
  bgColor?: string;
  /** Font size in the 1080p design space. */
  fontSize?: number;
  /** Text alignment. */
  align?: "left" | "center" | "right";
  /** Professional layout preset for the text card. */
  cardStyle?: "plain" | "title" | "banner" | "quote" | "lowerThird" | "gradient" | "highlight";
  /** Video playback speed (1 = normal). Only used for video slides. */
  playbackRate?: number;
  /** Loop the video to fill the slide duration (instead of freezing at its end). */
  loop?: boolean;
  /** Whether the green screen has been removed (images only). */
  chromaKey?: boolean;
  /** Original (un-keyed) source, kept so chroma key can be toggled off. */
  rawSrc?: string;
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
 * A background "group": one base slide plus the overlay slides that come right
 * after it in the list. Overlays ride ON their group's base for that base's time
 * window — so an overlay only composites over the item just behind it, not over
 * every base/foreground item.
 */
export interface BackgroundGroup {
  base: BackgroundSlide | null;
  overlays: BackgroundSlide[];
  durationSeconds: number;
}

/**
 * Group slides for playback: each non-overlay slide starts a new group; overlay
 * slides attach to the current group (the base just before them). A group lasts
 * as long as its base (or the overlay itself if there is no base). This is the
 * single source of truth used by BOTH the renderer and the duration calc.
 */
export function buildBackgroundGroups(slides: BackgroundSlide[]): BackgroundGroup[] {
  const groups: BackgroundGroup[] = [];
  let cur: BackgroundGroup | null = null;
  for (const s of slides) {
    const dur = Math.max(0.1, Number(s.durationSeconds) || 1);
    if (s.layer !== "overlay") {
      cur = { base: s, overlays: [], durationSeconds: dur };
      groups.push(cur);
    } else if (!cur) {
      // Overlay before any base → its own group over the gradient.
      cur = { base: null, overlays: [s], durationSeconds: dur };
      groups.push(cur);
    } else {
      cur.overlays.push(s);
    }
  }
  return groups;
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

/**
 * Social channel handles shown as an on-screen overlay at a chosen time — NOT
 * auto-posting. Only non-empty handles render. `showAtSeconds`/`durationSeconds`
 * place the overlay on the master timeline.
 */
export interface SocialConfig {
  enabled: boolean;
  youtube: string;
  instagram: string;
  facebook: string;
  x: string;
  /** When the overlay first appears, in seconds from the start of the video. */
  showAtSeconds: number;
  /** How long the overlay stays on screen each time, in seconds. */
  durationSeconds: number;
  /** Repeat interval in seconds (e.g. 30 = every 30s). 0 = show only once. */
  repeatEverySeconds: number;
  /** Also show during the intro and outro scenes. */
  showInIntroOutro: boolean;
  /** Where it sits vertically. */
  position: "top" | "bottom";
}

/**
 * One audio clip placed on the audio timeline. Plays from `startSeconds` on the
 * master timeline for `durationSeconds`, sourced from `trimStartSeconds` into the
 * file (cut/trim), with its own volume and fades. Rendered via a Remotion
 * <Audio> in a <Sequence>, so it plays in the preview AND in the export.
 */
export interface AudioClip {
  id: string;
  name: string;
  src: string;
  /** Position on the master video timeline, in seconds. */
  startSeconds: number;
  /** How long it plays (after trim), in seconds. */
  durationSeconds: number;
  /** In-point within the source file (cut from the start), in seconds. */
  trimStartSeconds: number;
  /** 0..1 clip volume. */
  volume: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
  /** Track/lane index (0-based) so clips can overlap on separate rows. */
  lane: number;
  /** Loop the source to fill `durationSeconds`. */
  loop: boolean;
  /** Muted (kept on the timeline but silent). */
  muted: boolean;
  /** Full source length in seconds (for trim clamping); 0 if unknown. */
  sourceDurationSeconds: number;
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
  /** Audio timeline: clips placed/trimmed/faded on the master timeline. */
  audioClips: AudioClip[];
  /** On-screen social channel handles (shown at a chosen time; not auto-posting). */
  social: SocialConfig;
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
export const PROJECT_VERSION = 9;

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

/** Compute concrete OUTPUT pixel dimensions for a resolution + aspect ratio. */
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

/**
 * Fixed DESIGN-SPACE dimensions (1080p grid) the composition always renders at,
 * per aspect ratio. Templates use pixel sizes tuned for this space, so changing
 * resolution never changes the layout — it only changes output sharpness via a
 * render `scale` (see `getRenderScale`). This keeps 4K identical to 1080p, just
 * crisper, instead of shrinking all text/margins.
 */
export function getBaseDimensions(aspect: AspectRatio): { width: number; height: number } {
  const long = 1920;
  const short = 1080;
  switch (aspect) {
    case "16:9":
      return { width: long, height: short };
    case "9:16":
      return { width: short, height: long };
    case "1:1":
      return { width: short, height: short };
  }
}

/** Multiplier from the 1080p design space to the target resolution's long edge. */
export function getRenderScale(resolution: Resolution): number {
  return BASE_EDGES[resolution].long / 1920;
}
