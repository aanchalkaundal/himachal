import React from "react";
import { AbsoluteFill, Img } from "remotion";
import type { SceneProps } from "./types";
import { useZoomIn, useFadeIn } from "@/remotion/animations/presets";

/** Closing scene: channel sign-off with logo. */
export const OutroScene: React.FC<SceneProps> = ({ project, theme }) => {
  const logo = useZoomIn({ delay: 2 });
  const thanks = useFadeIn({ delay: 14, duration: 18 });
  const { branding, media } = project;

  return (
    <AbsoluteFill
      style={{ fontFamily: theme.font, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}
    >
      <div style={logo}>
        {media.logo ? (
          <Img src={media.logo} style={{ height: 120, width: "auto" }} />
        ) : (
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 56, letterSpacing: 2 }}>{branding.channelName}</div>
        )}
      </div>
      <div style={{ ...thanks, color: "#e2e8f0", fontSize: 34, fontWeight: 600 }}>Thanks for watching</div>
      <div style={{ ...thanks, height: 4, width: 160, background: theme.accent }} />
      <div style={{ ...thanks, color: "#94a3b8", fontSize: 22, letterSpacing: 3 }}>{branding.channelName}</div>
    </AbsoluteFill>
  );
};
