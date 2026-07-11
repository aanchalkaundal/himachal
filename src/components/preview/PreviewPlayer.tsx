"use client";

import React, { useMemo } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { NewsComposition } from "@/remotion/NewsComposition";
import type { NewsProject } from "@/types/project";
import { buildTimeline } from "@/lib/timeline/buildTimeline";

/**
 * Live preview. The Player renders the exact same <NewsComposition> the server
 * renderer uses, driven by `inputProps={{ project }}` and the same timeline
 * calculation — so the preview and the exported MP4 are identical. Because the
 * project comes straight from the store, every edit re-renders instantly.
 */
export function PreviewPlayer({
  project,
  playerRef,
  fit = false,
}: {
  project: NewsProject;
  playerRef?: React.Ref<PlayerRef>;
  /** When true, the player fits inside its container (letterboxed) instead of
   * taking full width — lets the scene/audio timelines share the viewport. */
  fit?: boolean;
}) {
  const timeline = useMemo(() => buildTimeline(project), [project]);
  const inputProps = useMemo(() => ({ project }), [project]);

  return (
    <Player
      ref={playerRef}
      acknowledgeRemotionLicense
      component={NewsComposition as React.FC<Record<string, unknown>>}
      inputProps={inputProps}
      durationInFrames={timeline.totalDurationInFrames}
      compositionWidth={timeline.width}
      compositionHeight={timeline.height}
      fps={timeline.fps}
      controls
      style={
        fit
          ? { width: "100%", height: "100%", borderRadius: 12, overflow: "hidden" }
          : { width: "100%", borderRadius: 12, overflow: "hidden" }
      }
    />
  );
}
