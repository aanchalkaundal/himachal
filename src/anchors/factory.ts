import type { AnchorInstance, AnchorMetadata } from "@/anchors/types";

let seq = 0;

/** Build a placed anchor instance from its registry metadata + sensible defaults. */
export function createAnchorInstance(metadata: AnchorMetadata): AnchorInstance {
  seq += 1;
  return {
    instanceId: `anchor_${Date.now().toString(36)}_${seq}`,
    anchorId: metadata.id,
    enabled: true,
    visible: true,
    position: metadata.defaultPosition,
    customPosition: { x: 50, y: 50 },
    scale: metadata.defaultScale,
    opacity: 1,
    shadow: true,
    flip: false,
    layer: metadata.defaultLayer,
    entry: "fade",
    exit: "fade",
    animation: "auto",
    visibleScenes: "all",
    sceneAnimations: {},
  };
}
