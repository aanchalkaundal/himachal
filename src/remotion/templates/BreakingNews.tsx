import React from "react";
import { AbsoluteFill } from "remotion";
import type { TemplateProps } from "./types";
import { LowerThird } from "@/remotion/components/LowerThird";
import { useSlideIn, useTextReveal, useFadeIn } from "@/remotion/animations/presets";
import { formatDateTime } from "@/lib/format";

/**
 * Breaking-news headline layout (foreground only — the composition supplies the
 * persistent background, ticker, logo and watermark). Red BREAKING flag, bold
 * reveal headline, lower third.
 */
export const BreakingNews: React.FC<TemplateProps> = ({ project }) => {
  const { content, branding } = project;
  const flag = useSlideIn("left", { delay: 4, duration: 18 });
  const headlineReveal = useTextReveal({ delay: 16, duration: 26 });
  const subFade = useFadeIn({ delay: 34, duration: 20 });
  const metaFade = useFadeIn({ delay: 44, duration: 18 });
  const accent = branding.primaryColor;

  return (
    <AbsoluteFill style={{ fontFamily: branding.fontFamily }}>
      {/* Category / BREAKING flag */}
      <div style={{ position: "absolute", top: 60, left: 60, ...flag }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              background: accent,
              color: "#fff",
              fontWeight: 900,
              fontSize: 26,
              letterSpacing: 2,
              padding: "8px 18px",
              borderRadius: 4,
            }}
          >
            BREAKING
          </span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 22, letterSpacing: 3, opacity: 0.85 }}>
            {content.category}
          </span>
        </div>
      </div>

      {/* Headline block */}
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 210 }}>
        <div
          style={{
            ...headlineReveal,
            color: "#fff",
            fontSize: 66,
            lineHeight: 1.05,
            fontWeight: 900,
            textShadow: "0 4px 18px rgba(0,0,0,0.7)",
          }}
        >
          {content.headline}
        </div>
        {content.subtitle ? (
          <div style={{ ...subFade, color: "#f3f4f6", fontSize: 30, fontWeight: 600, marginTop: 16 }}>
            {content.subtitle}
          </div>
        ) : null}
        <div style={{ ...metaFade, color: "#d1d5db", fontSize: 22, fontWeight: 600, marginTop: 14 }}>
          {formatDateTime(content.date, content.time)}
        </div>
      </div>

      <LowerThird reporter={content.reporter} location={content.location} accent={accent} />
    </AbsoluteFill>
  );
};
