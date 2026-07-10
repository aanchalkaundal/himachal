import React from "react";
import { AbsoluteFill } from "remotion";
import type { TemplateProps } from "./types";
import { useSlideIn, useFadeIn, useBarGrow } from "@/remotion/animations/presets";
import { formatDateTime } from "@/lib/format";

/**
 * Modern headline layout (foreground only): translucent glass panel with a
 * left accent rail and a description block.
 */
export const ModernNews: React.FC<TemplateProps> = ({ project }) => {
  const { content, branding } = project;
  const accent = branding.primaryColor;
  const panel = useSlideIn("up", { delay: 8, duration: 26 }, 60);
  const rail = useBarGrow({ delay: 6, duration: 22 });
  const catFade = useFadeIn({ delay: 2, duration: 16 });
  const descFade = useFadeIn({ delay: 30, duration: 22 });

  return (
    <AbsoluteFill style={{ fontFamily: branding.fontFamily }}>
      <div style={{ position: "absolute", left: 70, right: 70, bottom: 130, ...panel }}>
        <div style={{ display: "flex", alignItems: "stretch", gap: 20 }}>
          <div style={{ ...rail, width: 8, borderRadius: 8, background: accent, transformOrigin: "top" }} />
          <div
            style={{
              flex: 1,
              background: "rgba(15,23,42,0.72)",
              backdropFilter: "blur(6px)",
              borderRadius: 14,
              padding: "28px 34px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ ...catFade, color: accent, fontWeight: 800, fontSize: 22, letterSpacing: 3 }}>
              {content.category}
            </div>
            <div style={{ color: "#fff", fontSize: 54, lineHeight: 1.08, fontWeight: 800, marginTop: 8 }}>
              {content.headline}
            </div>
            {content.subtitle ? (
              <div style={{ color: "#cbd5e1", fontSize: 26, fontWeight: 500, marginTop: 12 }}>{content.subtitle}</div>
            ) : null}
            <div style={{ ...descFade, color: "#94a3b8", fontSize: 21, marginTop: 16, maxWidth: 1100 }}>
              {content.description}
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 18, color: "#e2e8f0", fontSize: 20, fontWeight: 600 }}>
              <span>{content.reporter}</span>
              <span style={{ opacity: 0.5 }}>|</span>
              <span>{content.location}</span>
              <span style={{ opacity: 0.5 }}>|</span>
              <span>{formatDateTime(content.date, content.time)}</span>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
