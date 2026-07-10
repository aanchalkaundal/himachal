import React from "react";
import { AbsoluteFill } from "remotion";
import type { MediaAssets, NewsProject } from "@/types/project";
import type { TimelineScene } from "@/lib/timeline/types";
import type { Theme } from "@/remotion/theme";
import { SCENE_REGISTRY } from "@/remotion/scenes/registry";
import { Background } from "@/remotion/components/Background";
import { NewsTicker } from "@/remotion/components/NewsTicker";
import { AnchorLayer } from "@/anchors/components/AnchorLayer";

/** Split a scene's description into ticker lines (blank lines / sentence ends). */
function descriptionToItems(description?: string): string[] {
  const d = description?.trim();
  if (!d) return [];
  return d
    .split(/\n+|(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * Composes one scene together with its anchors in correct z-order:
 *
 *   background-layer anchors → desk-layer anchors → SCENE CONTENT →
 *   middle → front → overlay anchors
 *
 * Anchors are rendered per-scene (inside the scene's Sequence), which is what
 * makes them scene-independent timeline objects with their own entry/exit. The
 * renderer iterates the registry-driven instances — it has no anchor-specific
 * code, so new anchors need no changes here.
 */
export const SceneStage: React.FC<{ project: NewsProject; scene: TimelineScene; theme: Theme }> = ({
  project,
  scene,
  theme,
}) => {
  const Scene = SCENE_REGISTRY[scene.kind];
  const anchors = project.anchors;

  // Per-scene background: a story scene owns its imagery (fully overriding, so a
  // scene with no image shows the gradient, independent of any other scene).
  // Intro/outro (no story scene) fall back to project-level media.
  const sceneMedia = scene.data?.storyScene?.media;
  const media: MediaAssets = sceneMedia
    ? {
        ...project.media,
        backgroundImage: sceneMedia.backgroundImage,
        backgroundVideo: sceneMedia.backgroundVideo,
        backgroundSlides: sceneMedia.backgroundSlides,
      }
    : project.media;

  // Per-scene ticker: scrolls THIS scene's own description (falls back to the
  // project ticker items when the scene has no description). Frame is local to
  // the scene's Sequence, so each scene's ticker starts fresh with its own text.
  const descItems = descriptionToItems(scene.data?.storyScene?.content.description);
  const items = descItems.length > 0 ? descItems : project.ticker.items;
  const sceneTicker = { ...project.ticker, items };

  return (
    <AbsoluteFill>
      <Background media={media} from={theme.from} to={theme.to} scrim={theme.scrim} />
      <AnchorLayer layer="background" anchors={anchors} scene={scene} />
      <AnchorLayer layer="desk" anchors={anchors} scene={scene} />

      <Scene project={project} scene={scene} theme={theme} />

      <AnchorLayer layer="middle" anchors={anchors} scene={scene} />
      <AnchorLayer layer="front" anchors={anchors} scene={scene} />
      <AnchorLayer layer="overlay" anchors={anchors} scene={scene} />

      <NewsTicker ticker={sceneTicker} accent={theme.accent} />
    </AbsoluteFill>
  );
};
