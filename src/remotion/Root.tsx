import React from "react";
import { Composition } from "remotion";
import { NewsComposition } from "./NewsComposition";
import { NEWS_COMPOSITION_ID } from "./constants";
import { createDefaultProject } from "@/lib/defaults";
import { buildTimeline } from "@/lib/timeline/buildTimeline";
import type { NewsProject } from "@/types/project";

/**
 * Remotion root — registered for server rendering. The live preview mounts
 * <NewsComposition> directly through the Player; keeping one registered
 * composition means the programmatic renderer and `npx remotion` share the
 * exact same component + metadata calculation.
 */
const DEFAULT = createDefaultProject("2026-01-01T09:00:00.000Z");
const DEFAULT_TL = buildTimeline(DEFAULT);

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id={NEWS_COMPOSITION_ID}
      component={NewsComposition as React.FC<Record<string, unknown>>}
      durationInFrames={DEFAULT_TL.totalDurationInFrames}
      fps={DEFAULT_TL.fps}
      width={DEFAULT_TL.width}
      height={DEFAULT_TL.height}
      defaultProps={{ project: DEFAULT }}
      // Recompute dimensions/duration from the incoming project so one
      // composition renders any aspect ratio / fps / scene length the editor produces.
      calculateMetadata={({ props }: { props: Record<string, unknown> }) => {
        const project = (props as { project: NewsProject }).project;
        const tl = buildTimeline(project);
        return {
          durationInFrames: tl.totalDurationInFrames,
          fps: tl.fps,
          width: tl.width,
          height: tl.height,
        };
      }}
    />
  );
};
