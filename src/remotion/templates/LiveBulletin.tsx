import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { TemplateProps } from "./types";
import { useSlideIn, useFadeIn, useBarGrow } from "@/remotion/animations/presets";
import { LowerThird } from "@/remotion/components/LowerThird";
import { formatDateTime } from "@/lib/format";

/**
 * Live Bulletin — an on-air studio look: a pulsing LIVE badge in the top-right,
 * a gradient glass headline panel anchored bottom-left, and a broadcast-style
 * lower third. Foreground only.
 */
export const LiveBulletin: React.FC<TemplateProps> = ({ project }) => {
  const { content, branding } = project;
  const accent = branding.primaryColor;
  const frame = useCurrentFrame();

  // Deterministic pulsing dot (2s cycle @ 30fps ≈ 60 frames).
  const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(frame / 9));

  const badge = useSlideIn("down", { delay: 6, duration: 16 });
  const panel = useSlideIn("up", { delay: 14, duration: 24 }, 70);
  const rail = useBarGrow({ delay: 12, duration: 20 });
  const desc = useFadeIn({ delay: 40, duration: 22 });

  return (
    <AbsoluteFill style={{ fontFamily: branding.fontFamily }}>
      {/* LIVE badge */}
      <div style={{ position: "absolute", top: 56, right: 64, ...badge }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: accent,
            padding: "10px 18px",
            borderRadius: 6,
            boxShadow: "0 8px 26px rgba(0,0,0,0.4)",
          }}
        >
          <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", opacity: pulse }} />
          <span style={{ color: "#fff", fontWeight: 900, fontSize: 24, letterSpacing: 4 }}>LIVE</span>
        </div>
      </div>

      {/* Headline panel */}
      <div style={{ position: "absolute", left: 64, right: 260, bottom: 150, ...panel }}>
        <div style={{ display: "flex", alignItems: "stretch", gap: 18 }}>
          <div style={{ ...rail, width: 10, borderRadius: 10, background: accent, transformOrigin: "top" }} />
          <div
            style={{
              flex: 1,
              background: "linear-gradient(135deg, rgba(2,6,23,0.86), rgba(15,23,42,0.7))",
              backdropFilter: "blur(8px)",
              borderRadius: 16,
              padding: "26px 34px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ color: accent, fontWeight: 800, fontSize: 22, letterSpacing: 3, textTransform: "uppercase" }}>
              {content.category}
            </div>
            <div style={{ color: "#fff", fontSize: 58, lineHeight: 1.25, fontWeight: 900, marginTop: 8 }}>
              {content.headline}
            </div>
            {content.subtitle ? (
              <div style={{ color: "#dbeafe", fontSize: 26, fontWeight: 500, marginTop: 12 }}>{content.subtitle}</div>
            ) : null}
            <div style={{ ...desc, color: "#94a3b8", fontSize: 20, marginTop: 14, maxWidth: 1050 }}>
              {content.description}
            </div>
            <div style={{ color: "#e2e8f0", fontSize: 20, fontWeight: 700, marginTop: 16, letterSpacing: 1 }}>
              {formatDateTime(content.date, content.time)}
            </div>
          </div>
        </div>
      </div>

      <LowerThird reporter={content.reporter} location={content.location} accent={accent} delay={46} />
    </AbsoluteFill>
  );
};
