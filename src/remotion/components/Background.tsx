import React from "react";
import { AbsoluteFill, Img, OffthreadVideo } from "remotion";
import type { MediaAssets } from "@/types/project";
import { useKenBurns } from "@/remotion/animations/presets";

interface BackgroundProps {
  media: MediaAssets;
  /** Fallback gradient colors when no media background is set. */
  from: string;
  to: string;
  /** Dark overlay opacity (0..1) to keep text legible over imagery. */
  scrim?: number;
}

/**
 * Template-agnostic background layer: prefers a background video, then an
 * image (with a slow Ken Burns push), else a themed gradient. A scrim keeps
 * foreground text readable regardless of the underlying media.
 */
export const Background: React.FC<BackgroundProps> = ({ media, from, to, scrim = 0.35 }) => {
  const ken = useKenBurns();
  return (
    <AbsoluteFill>
      {media.backgroundVideo ? (
        <OffthreadVideo src={media.backgroundVideo} muted style={{ objectFit: "cover", width: "100%", height: "100%" }} />
      ) : media.backgroundImage ? (
        <AbsoluteFill style={ken}>
          <Img src={media.backgroundImage} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }} />
      )}
      <AbsoluteFill style={{ background: `rgba(0,0,0,${scrim})` }} />
    </AbsoluteFill>
  );
};
