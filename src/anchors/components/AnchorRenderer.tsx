import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { AnchorInstance } from "@/anchors/types";
import type { TimelineScene } from "@/lib/timeline/types";
import { getAnchorEntry } from "@/anchors/registry";
import { resolveAnchorState, autoAnimationForScene } from "@/anchors/animations/state";
import { getEnterExitStyle } from "@/anchors/animations/entryExit";
import { placementStyle } from "./placement";

/**
 * Renders ONE anchor instance inside a scene. Frame is local to the scene
 * (Remotion Sequence resets it), so entry/exit and talking are scene-scoped and
 * independent. Resolves the character from the registry by id — never by name.
 */
export const AnchorRenderer: React.FC<{ instance: AnchorInstance; scene: TimelineScene }> = ({ instance, scene }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const entry = getAnchorEntry(instance.anchorId);
  if (!entry) return null;
  const Character = entry.component;

  // Resolve which animation plays this scene.
  const animation =
    instance.animation !== "auto"
      ? instance.animation
      : instance.sceneAnimations[scene.index] ?? autoAnimationForScene(scene.kind);

  const state = resolveAnchorState(animation, frame, fps);
  const enterExit = getEnterExitStyle(instance.entry, instance.exit, frame, scene.durationInFrames, fps);
  const container = placementStyle(instance, width, height);

  const flip = instance.flip ? "scaleX(-1)" : "";
  const shadow = instance.shadow ? "drop-shadow(0 18px 18px rgba(0,0,0,0.45))" : undefined;

  return (
    <div
      style={{
        ...container,
        opacity: instance.opacity * enterExit.opacity,
        transform: `${enterExit.transform} ${flip}`.trim(),
        transformOrigin: "bottom center",
        filter: shadow,
        pointerEvents: "none",
      }}
    >
      <Character state={state} />
      {instance.position === "behind-desk" ? (
        // Self-contained desk so "behind desk" reads correctly without a studio.
        <div
          style={{
            position: "absolute",
            left: "-30%",
            right: "-30%",
            bottom: 0,
            height: "26%",
            background: "linear-gradient(180deg, #1f2937 0%, #0b1220 100%)",
            borderTop: "4px solid rgba(255,255,255,0.15)",
            borderRadius: "10px 10px 0 0",
          }}
        />
      ) : null}
    </div>
  );
};
