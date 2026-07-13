import React from "react";
import { AbsoluteFill } from "remotion";
import type { MediaAssets, NewsProject } from "@/types/project";
import type { TimelineScene } from "@/lib/timeline/types";
import type { Theme } from "@/remotion/theme";
import { SCENE_REGISTRY } from "@/remotion/scenes/registry";
import { Background } from "@/remotion/components/Background";
import { NewsTicker } from "@/remotion/components/NewsTicker";
import { AnchorLayer } from "@/anchors/components/AnchorLayer";

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

  return (
    <AbsoluteFill>
      <Background media={media} from={theme.from} to={theme.to} scrim={theme.scrim} accent={theme.accent} />
      <AnchorLayer layer="background" anchors={anchors} scene={scene} />
      <AnchorLayer layer="desk" anchors={anchors} scene={scene} />

      <Scene project={project} scene={scene} theme={theme} />

      <AnchorLayer layer="middle" anchors={anchors} scene={scene} />
      <AnchorLayer layer="front" anchors={anchors} scene={scene} />
      <AnchorLayer layer="overlay" anchors={anchors} scene={scene} />

      {/* Ticker scrolls the manual ticker items on loop (not the description). */}
      <NewsTicker ticker={project.ticker} accent={theme.accent} />
    </AbsoluteFill>
  );
};
