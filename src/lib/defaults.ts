import type { NewsProject, NewsContent, StoryScene, TemplateId } from "@/types/project";
import { PROJECT_VERSION } from "@/types/project";

/** Small deterministic id generator (no crypto dependency needed for Phase 1). */
export function createId(prefix = "proj"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Empty content for a brand-new, blank scene the user then fills in. */
export function createBlankContent(_now: string = new Date().toISOString()): NewsContent {
  // Category/reporter/location/date/time are no longer edited in the UI, so keep
  // them empty — templates hide/omit them when blank.
  return {
    headline: "",
    subtitle: "",
    description: "",
    category: "",
    reporter: "",
    location: "",
    date: "",
    time: "",
  };
}

/** Build a story scene from content + template. */
export function createStoryScene(
  name: string,
  content: NewsContent,
  templateId: TemplateId = "modern-news",
  durationSeconds = 6,
  media: StoryScene["media"] = {},
): StoryScene {
  return { id: createId("scene"), name, templateId, durationSeconds, content, media };
}

/**
 * Factory for a brand-new project with sensible, presentable defaults so the
 * live preview looks like a real news bulletin the moment the editor opens.
 */
export function createDefaultProject(now: string = new Date().toISOString()): NewsProject {
  const content: NewsContent = {
    headline: "Breaking: Major Development Unfolds Across the Region",
    subtitle: "Officials respond as the situation develops",
    description:
      "Authorities have issued a statement following today's events. Our correspondent brings the latest updates from the ground as more details emerge.",
    category: "",
    reporter: "",
    location: "",
    date: "",
    time: "",
  };
  const scene1 = createStoryScene("Scene 1", content, "modern-news", 6);
  return {
    version: PROJECT_VERSION,
    id: createId(),
    name: "Untitled News Project",
    createdAt: now,
    updatedAt: now,
    content,
    storyScenes: [scene1],
    activeSceneId: scene1.id,
    media: {},
    branding: {
      channelName: "NEWS 24",
      watermark: "NEWS 24",
      primaryColor: "#e11d2a",
      secondaryColor: "#0b1f3a",
      fontFamily: "Arial, Helvetica, 'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', sans-serif",
    },
    ticker: {
      enabled: true,
      label: "GROUND DETAILS",
      items: [
        "Live coverage continues throughout the day",
        "Stay tuned for the latest updates",
        "More details to follow shortly",
      ],
      speed: 150,
    },
    audio: {
      masterVolume: 1,
      musicVolume: 0.6,
      fadeInSeconds: 1,
      fadeOutSeconds: 1.5,
    },
    social: {
      enabled: true,
      youtube: "",
      instagram: "",
      facebook: "",
      x: "",
      showAtSeconds: 3,
      durationSeconds: 4,
      repeatEverySeconds: 30,
      showInIntroOutro: true,
      position: "bottom",
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
      templateId: "modern-news",
      resolution: "2160p",
      aspectRatio: "16:9",
      fps: 60,
      format: "mp4",
    },
  };
}
