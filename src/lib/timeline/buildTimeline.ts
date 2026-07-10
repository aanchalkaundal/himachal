import type { NewsProject } from "@/types/project";
import { getDimensions } from "@/types/project";
import type { Timeline, TimelineScene, TimelineTransition, TransitionType } from "./types";

/** Split a description into paragraph scenes (unlimited). Falls back to one. */
export function splitParagraphs(description: string): string[] {
  const parts = description
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [description.trim()].filter(Boolean);
}

const secToFrames = (seconds: number, fps: number) => Math.max(1, Math.round(seconds * fps));

/**
 * Pure timeline builder — the single place that turns a project's scene config
 * into concrete, frame-accurate scenes + transitions. Both the live preview and
 * the server renderer call this, guaranteeing the export matches the preview.
 *
 * TransitionSeries overlaps neighbouring scenes by the transition duration, so
 * the master timeline total is `sum(sceneDurations) - sum(transitionDurations)`.
 */
export function buildTimeline(project: NewsProject): Timeline {
  const { fps } = project.settings;
  const { width, height } = getDimensions(project.settings.resolution, project.settings.aspectRatio);
  const sc = project.scenes;

  const transitionType: TransitionType = sc.transition;
  const transitionFrames = transitionType === "none" ? 0 : secToFrames(sc.transitionSeconds, fps);

  // 1. Build the ordered scene list (durations only).
  const draft: Array<Pick<TimelineScene, "kind" | "durationInFrames" | "data">> = [];

  if (sc.includeIntro) {
    draft.push({ kind: "intro", durationInFrames: secToFrames(sc.introSeconds, fps) });
  }

  const storyScenes = project.storyScenes ?? [];
  if (storyScenes.length > 0) {
    // Story-timeline path: one scene per user-authored StoryScene, each with its
    // own template + content + duration. Rendered sequentially into one video.
    storyScenes.forEach((scene) => {
      draft.push({
        kind: "story",
        durationInFrames: secToFrames(scene.durationSeconds, fps),
        data: { storyScene: scene },
      });
    });
  } else {
    // Legacy single-content path: headline + one body scene per paragraph.
    const paragraphs = splitParagraphs(project.content.description);
    draft.push({ kind: "headline", durationInFrames: secToFrames(sc.headlineSeconds, fps) });
    paragraphs.forEach((paragraph, i) => {
      draft.push({
        kind: "body",
        durationInFrames: secToFrames(sc.bodySecondsPerParagraph, fps),
        data: { paragraph, paragraphIndex: i, paragraphCount: paragraphs.length },
      });
    });
  }

  if (sc.includeOutro) {
    draft.push({ kind: "outro", durationInFrames: secToFrames(sc.outroSeconds, fps) });
  }

  // 2. Assign absolute frames, accounting for transition overlaps.
  const scenes: TimelineScene[] = [];
  const transitions: TimelineTransition[] = [];
  let cursor = 0;
  draft.forEach((d, i) => {
    const startFrame = cursor;
    const endFrame = startFrame + d.durationInFrames;
    scenes.push({
      id: `scene_${i}_${d.kind}`,
      kind: d.kind,
      index: i,
      durationInFrames: d.durationInFrames,
      startFrame,
      endFrame,
      data: d.data,
    });
    // Next scene starts `transitionFrames` earlier (the overlap).
    cursor = endFrame - (i < draft.length - 1 ? transitionFrames : 0);
    if (i < draft.length - 1) {
      transitions.push({ type: transitionType, durationInFrames: transitionFrames });
    }
  });

  const totalDurationInFrames = Math.max(
    1,
    draft.reduce((sum, d) => sum + d.durationInFrames, 0) - transitionFrames * transitions.length,
  );

  return {
    fps,
    width,
    height,
    aspectRatio: project.settings.aspectRatio,
    scenes,
    transitions,
    totalDurationInFrames,
  };
}
