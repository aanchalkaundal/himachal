import React from "react";
import { AbsoluteFill } from "remotion";
import type { AnchorInstance, AnchorLayerId } from "@/anchors/types";
import type { TimelineScene } from "@/lib/timeline/types";
import { AnchorRenderer } from "./AnchorRenderer";

/** Is this instance active and visible in the given scene? */
export function isAnchorVisibleInScene(instance: AnchorInstance, sceneIndex: number): boolean {
  if (!instance.enabled || !instance.visible) return false;
  return instance.visibleScenes === "all" || instance.visibleScenes.includes(sceneIndex);
}

/**
 * Renders all anchors assigned to one compositing layer for one scene. Multiple
 * anchors per layer are supported (multi-anchor: anchor + guest/reporter), drawn
 * in instance order.
 */
export const AnchorLayer: React.FC<{
  layer: AnchorLayerId;
  anchors: AnchorInstance[];
  scene: TimelineScene;
}> = ({ layer, anchors, scene }) => {
  const forLayer = anchors.filter((a) => a.layer === layer && isAnchorVisibleInScene(a, scene.index));
  if (forLayer.length === 0) return null;
  return (
    <AbsoluteFill>
      {forLayer.map((a) => (
        <AnchorRenderer key={a.instanceId} instance={a} scene={scene} />
      ))}
    </AbsoluteFill>
  );
};
