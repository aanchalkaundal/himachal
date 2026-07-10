import React from "react";
import { AbsoluteFill } from "remotion";
import type { TemplateProps } from "./types";
import { useSlideIn, useFadeIn, useZoomIn } from "@/remotion/animations/presets";
import { formatDateTime } from "@/lib/format";

/**
 * Data Pulse — a finance/markets aesthetic: a dark gradient scrim, a gradient
 * headline, and a row of staggered "chip" cards built from the project meta
 * (category / reporter / location / time). Foreground only.
 */
export const DataPulse: React.FC<TemplateProps> = ({ project }) => {
  const { content, branding } = project;
  const accent = branding.primaryColor;
  const secondary = branding.secondaryColor || accent;

  const tag = useSlideIn("left", { delay: 6, duration: 16 });
  const headline = useSlideIn("up", { delay: 16, duration: 24 }, 50);
  const desc = useFadeIn({ delay: 36, duration: 22 });

  // Fixed length so the per-chip hook count is stable across renders.
  const chips = [
    { label: "DESK", value: content.category },
    { label: "REPORTER", value: content.reporter },
    { label: "LOCATION", value: content.location },
    { label: "FILED", value: formatDateTime(content.date, content.time) },
  ];

  return (
    <AbsoluteFill style={{ fontFamily: branding.fontFamily }}>
      {/* Bottom gradient scrim for legibility */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(2,6,23,0.92) 12%, rgba(2,6,23,0.35) 46%, transparent 70%)",
        }}
      />

      <div style={{ position: "absolute", left: 80, right: 80, bottom: 150 }}>
        {/* Tag */}
        <div style={{ ...tag, display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: accent }} />
          <span style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 22, letterSpacing: 4, textTransform: "uppercase" }}>
            {content.category}
          </span>
        </div>

        {/* Gradient headline */}
        <div
          style={{
            ...headline,
            fontSize: 68,
            lineHeight: 1.04,
            fontWeight: 900,
            letterSpacing: -0.5,
            backgroundImage: `linear-gradient(100deg, #ffffff 30%, ${secondary})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {content.headline}
        </div>

        {content.subtitle ? (
          <div style={{ ...desc, color: "#cbd5e1", fontSize: 26, fontWeight: 500, marginTop: 14, maxWidth: 1150 }}>
            {content.subtitle}
          </div>
        ) : null}

        {/* Stat chips */}
        <div style={{ display: "flex", gap: 16, marginTop: 26, flexWrap: "wrap" }}>
          {chips.map((c, i) => {
            const chip = useZoomIn({ delay: 30 + i * 6 }, 0.8);
            if (!c.value) return null;
            return (
              <div
                key={c.label}
                style={{
                  ...chip,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderLeft: `3px solid ${accent}`,
                  borderRadius: 10,
                  padding: "12px 18px",
                  minWidth: 150,
                }}
              >
                <div style={{ color: accent, fontSize: 14, fontWeight: 800, letterSpacing: 2 }}>{c.label}</div>
                <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginTop: 4 }}>{c.value}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
