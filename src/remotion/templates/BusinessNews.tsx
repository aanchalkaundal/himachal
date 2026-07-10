import React from "react";
import { AbsoluteFill } from "remotion";
import type { TemplateProps } from "./types";
import { useSlideIn, useFadeIn } from "@/remotion/animations/presets";
import { formatDateTime } from "@/lib/format";

/**
 * Business headline layout (foreground only): split composition with a solid
 * side column for the headline and a lighter body column.
 */
export const BusinessNews: React.FC<TemplateProps> = ({ project }) => {
  const { content, branding } = project;
  const accent = branding.primaryColor;
  const col = useSlideIn("left", { delay: 6, duration: 24 }, 120);
  const bodyFade = useFadeIn({ delay: 24, duration: 22 });

  return (
    <AbsoluteFill style={{ fontFamily: branding.fontFamily }}>
      {/* Left headline column */}
      <div
        style={{
          ...col,
          position: "absolute",
          top: 0,
          bottom: 64,
          left: 0,
          width: "46%",
          background: `linear-gradient(160deg, ${branding.secondaryColor} 0%, rgba(11,18,32,0.6) 100%)`,
          padding: "80px 50px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          borderRight: `6px solid ${accent}`,
        }}
      >
        <div style={{ color: accent, fontWeight: 800, fontSize: 22, letterSpacing: 3 }}>{content.category}</div>
        <div style={{ color: "#fff", fontSize: 52, lineHeight: 1.08, fontWeight: 800, marginTop: 14 }}>
          {content.headline}
        </div>
        {content.subtitle ? (
          <div style={{ color: "#cbd5e1", fontSize: 24, marginTop: 14, fontWeight: 500 }}>{content.subtitle}</div>
        ) : null}
      </div>

      {/* Right body */}
      <div
        style={{
          ...bodyFade,
          position: "absolute",
          top: 0,
          bottom: 64,
          right: 0,
          width: "54%",
          padding: "0 60px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#e2e8f0", fontSize: 24, lineHeight: 1.5 }}>{content.description}</div>
        <div style={{ marginTop: 26, color: "#94a3b8", fontSize: 20, fontWeight: 600 }}>
          {content.reporter} — {content.location}
        </div>
        <div style={{ marginTop: 4, color: "#64748b", fontSize: 18 }}>{formatDateTime(content.date, content.time)}</div>
      </div>
    </AbsoluteFill>
  );
};
