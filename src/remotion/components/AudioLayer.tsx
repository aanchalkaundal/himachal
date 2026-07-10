import React from "react";
import { Audio, Sequence, interpolate } from "remotion";
import type { NewsProject } from "@/types/project";

interface AudioLayerProps {
  project: NewsProject;
  totalDurationInFrames: number;
  fps: number;
  introFrames: number;
  outroStartFrame: number;
  outroFrames: number;
}

/**
 * Modular audio mixer. Background music plays across the whole timeline with
 * master×music volume and frame-accurate fade in/out; optional intro/outro
 * stings sit at the head and tail. Kept separate from visual scenes so audio
 * can evolve (voice-over, ducking) without touching the renderer.
 */
export const AudioLayer: React.FC<AudioLayerProps> = ({
  project,
  totalDurationInFrames,
  fps,
  introFrames,
  outroStartFrame,
  outroFrames,
}) => {
  const { media, audio } = project;
  const base = Math.max(0, Math.min(1, audio.masterVolume)) * Math.max(0, Math.min(1, audio.musicVolume));
  const fadeIn = Math.max(0, audio.fadeInSeconds * fps);
  const fadeOut = Math.max(0, audio.fadeOutSeconds * fps);

  // Frame → volume with fade in at the start and fade out at the end.
  const musicVolume = (frame: number) => {
    const inGain = fadeIn > 0 ? interpolate(frame, [0, fadeIn], [0, 1], { extrapolateRight: "clamp" }) : 1;
    const outGain =
      fadeOut > 0
        ? interpolate(frame, [totalDurationInFrames - fadeOut, totalDurationInFrames], [1, 0], {
            extrapolateLeft: "clamp",
          })
        : 1;
    return base * Math.max(0, Math.min(inGain, outGain));
  };

  return (
    <>
      {media.backgroundMusic ? <Audio src={media.backgroundMusic} volume={musicVolume} loop /> : null}
      {media.introMusic && introFrames > 0 ? (
        <Sequence durationInFrames={introFrames}>
          <Audio src={media.introMusic} volume={audio.masterVolume} />
        </Sequence>
      ) : null}
      {media.outroMusic && outroFrames > 0 ? (
        <Sequence from={outroStartFrame} durationInFrames={outroFrames}>
          <Audio src={media.outroMusic} volume={audio.masterVolume} />
        </Sequence>
      ) : null}
    </>
  );
};
