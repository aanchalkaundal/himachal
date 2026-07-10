import React from "react";
import { AbsoluteFill, Img } from "remotion";
import type { SceneProps } from "./types";
import { useZoomIn, useFadeIn, useBarGrow } from "@/remotion/animations/presets";

/** Opening scene: animated logo/channel reveal with category + date. */
export const IntroScene: React.FC<SceneProps> = ({ project, theme }) => {
  const logoAnim = useZoomIn({ delay: 2 });
  const nameFade = useFadeIn({ delay: 12, duration: 16 });
  const bar = useBarGrow({ delay: 18, duration: 16 });
  const catFade = useFadeIn({ delay: 24, duration: 16 });
  const { branding, content, media } = project;

  return (
    <AbsoluteFill
      style={{
        fontFamily: theme.font,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div style={logoAnim}>
        {media.logo ? (
          <Img src={media.logo} style={{ height: 140, width: "auto" }} />
        ) : (
          <div
            style={{
              background: theme.accent,
              color: "#fff",
              fontWeight: 900,
              fontSize: 54,
              letterSpacing: 2,
              padding: "16px 30px",
              borderRadius: 12,
            }}
          >
            {branding.channelName}
          </div>
        )}
      </div>
      <div style={{ ...nameFade, color: "#fff", fontSize: 40, fontWeight: 800, letterSpacing: 2 }}>
        {branding.channelName}
      </div>
      <div style={{ ...bar, height: 5, width: 220, background: theme.accent }} />
      <div style={{ ...catFade, color: "#cbd5e1", fontSize: 24, fontWeight: 600, letterSpacing: 4 }}>
        {content.category}
      </div>
    </AbsoluteFill>
  );
};
