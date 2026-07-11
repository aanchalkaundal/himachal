/**
 * Broad media-type detection so the app accepts audio/image/video in (almost)
 * any container/extension — not just the few a browser reports a MIME type for.
 * Detection uses the file's MIME first, then falls back to its extension.
 *
 * Note: the browser + Remotion's Chromium can only DECODE formats their codecs
 * support (e.g. HEIC images, AVI/WMV video are not natively decodable). We accept
 * and store any file; playback/preview quality depends on the platform's codecs.
 */

export type MediaKind = "image" | "video" | "audio";

const IMAGE_EXT = new Set([
  "jpg", "jpeg", "jfif", "png", "gif", "webp", "svg", "avif", "bmp", "ico",
  "tif", "tiff", "heic", "heif", "apng",
]);
const VIDEO_EXT = new Set([
  "mp4", "m4v", "webm", "mov", "mkv", "avi", "wmv", "flv", "ogv", "3gp", "3g2",
  "mpg", "mpeg", "mts", "m2ts", "ts", "vob", "ogm",
]);
const AUDIO_EXT = new Set([
  "mp3", "wav", "wave", "ogg", "oga", "m4a", "aac", "flac", "opus", "weba",
  "wma", "aiff", "aif", "aifc", "amr", "mid", "midi", "ac3", "caf",
]);

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** Resolve a file to image/video/audio (or null if it's none of them). */
export function mediaKindFromFile(file: File): MediaKind | null {
  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  const ext = extOf(file.name);
  if (IMAGE_EXT.has(ext)) return "image";
  if (VIDEO_EXT.has(ext)) return "video";
  if (AUDIO_EXT.has(ext)) return "audio";
  return null;
}

const dotList = (set: Set<string>) => Array.from(set, (e) => `.${e}`).join(",");

/** `accept` attribute values that surface as many formats as possible. */
export const ACCEPT_IMAGE = `image/*,${dotList(IMAGE_EXT)}`;
export const ACCEPT_VIDEO = `video/*,${dotList(VIDEO_EXT)}`;
export const ACCEPT_AUDIO = `audio/*,${dotList(AUDIO_EXT)}`;
export const ACCEPT_IMAGE_VIDEO = `image/*,video/*,${dotList(IMAGE_EXT)},${dotList(VIDEO_EXT)}`;
