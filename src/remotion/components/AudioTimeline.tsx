import React from "react";
import { Audio, Sequence, interpolate, useVideoConfig } from "remotion";
import type { AudioClip } from "@/types/project";

/**
 * Renders the audio-timeline clips. Each clip is a Remotion <Audio> inside a
 * timed <Sequence>, trimmed to its in-point and shaped by per-clip fades — so it
 * plays in the live preview AND is muxed into the exported video, positioned
 * exactly where the user placed it on the timeline.
 */
export const AudioTimeline: React.FC<{ clips: AudioClip[]; master: number }> = ({ clips, master }) => {
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <>
      {clips.map((clip) => {
        if (clip.muted) return null;
        const from = Math.max(0, Math.round(clip.startSeconds * fps));
        if (from >= durationInFrames) return null;
        let wantedSec = clip.durationSeconds;
        // Without looping, a clip can't play past the end of its (trimmed) source.
        if (!clip.loop && clip.sourceDurationSeconds > 0) {
          wantedSec = Math.min(wantedSec, Math.max(0.05, clip.sourceDurationSeconds - clip.trimStartSeconds));
        }
        const wanted = Math.max(1, Math.round(wantedSec * fps));
        const dur = Math.min(wanted, durationInFrames - from);
        const startFrom = Math.max(0, Math.round(clip.trimStartSeconds * fps));
        const fadeIn = Math.max(0, Math.round(clip.fadeInSeconds * fps));
        const fadeOut = Math.max(0, Math.round(clip.fadeOutSeconds * fps));
        const vol = Math.max(0, Math.min(1, clip.volume));

        return (
          <Sequence key={clip.id} from={from} durationInFrames={dur}>
            <Audio
              src={clip.src}
              startFrom={startFrom}
              loop={clip.loop}
              volume={(f) => {
                const i = fadeIn > 0 ? interpolate(f, [0, fadeIn], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
                const o = fadeOut > 0 ? interpolate(f, [dur - fadeOut, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
                return Math.max(0, vol * master * Math.min(i, o));
              }}
            />
          </Sequence>
        );
      })}
    </>
  );
};
