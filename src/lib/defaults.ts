import type { NewsProject } from "@/types/project";
import { PROJECT_VERSION } from "@/types/project";

/** Small deterministic id generator (no crypto dependency needed for Phase 1). */
export function createId(prefix = "proj"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * Factory for a brand-new project with sensible, presentable defaults so the
 * live preview looks like a real news bulletin the moment the editor opens.
 */
export function createDefaultProject(now: string = new Date().toISOString()): NewsProject {
  const dateObj = new Date(now);
  return {
    version: PROJECT_VERSION,
    id: createId(),
    name: "Untitled News Project",
    createdAt: now,
    updatedAt: now,
    content: {
      headline: "Breaking: Major Development Unfolds Across the Region",
      subtitle: "Officials respond as the situation develops",
      description:
        "Authorities have issued a statement following today's events. Our correspondent brings the latest updates from the ground as more details emerge.",
      category: "GENERAL",
      reporter: "A. Reporter",
      location: "New Delhi",
      date: now.slice(0, 10),
      time: `${String(dateObj.getHours()).padStart(2, "0")}:${String(
        dateObj.getMinutes(),
      ).padStart(2, "0")}`,
    },
    media: {},
    branding: {
      channelName: "NEWS 24",
      watermark: "NEWS 24",
      primaryColor: "#e11d2a",
      secondaryColor: "#0b1f3a",
      fontFamily: "Arial, Helvetica, sans-serif",
    },
    ticker: {
      enabled: true,
      label: "BREAKING NEWS",
      items: [
        "Live coverage continues throughout the day",
        "Stay tuned for the latest updates",
        "More details to follow shortly",
      ],
      speed: 90,
    },
    audio: {
      masterVolume: 1,
      musicVolume: 0.6,
      fadeInSeconds: 1,
      fadeOutSeconds: 1.5,
    },
    anchors: [],
    scenes: {
      includeIntro: true,
      includeOutro: true,
      introSeconds: 2.5,
      headlineSeconds: 5,
      bodySecondsPerParagraph: 4,
      outroSeconds: 2.5,
      transition: "fade",
      transitionSeconds: 0.6,
    },
    settings: {
      templateId: "breaking-news",
      resolution: "1080p",
      aspectRatio: "16:9",
      fps: 30,
      format: "mp4",
    },
  };
}
