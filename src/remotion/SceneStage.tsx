import React from "react";
import { AbsoluteFill } from "remotion";
import type { NewsProject } from "@/types/project";
import type { TimelineScene } from "@/lib/timeline/types";
import type { Theme } from "@/remotion/theme";
import { SCENE_REGISTRY } from "@/remotion/scenes/registry";
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

  return (
    <AbsoluteFill>
      <AnchorLayer layer="background" anchors={anchors} scene={scene} />
      <AnchorLayer layer="desk" anchors={anchors} scene={scene} />

      <Scene project={project} scene={scene} theme={theme} />

      <AnchorLayer layer="middle" anchors={anchors} scene={scene} />
      <AnchorLayer layer="front" anchors={anchors} scene={scene} />
      <AnchorLayer layer="overlay" anchors={anchors} scene={scene} />
    </AbsoluteFill>
  );
};
