import React from "react";
import { AbsoluteFill } from "remotion";
import type { TemplateProps } from "./types";
import { useTextReveal, useFadeIn, useBarGrow } from "@/remotion/animations/presets";
import { formatDateTime } from "@/lib/format";

/**
 * Minimal headline layout (foreground only): typography-forward, lots of
 * negative space, a single accent underline, restrained motion.
 */
export const MinimalNews: React.FC<TemplateProps> = ({ project }) => {
  const { content, branding } = project;
  const accent = branding.primaryColor;
  const reveal = useTextReveal({ delay: 10, duration: 30 });
  const underline = useBarGrow({ delay: 26, duration: 24 });
  const metaFade = useFadeIn({ delay: 36, duration: 22 });

  return (
    <AbsoluteFill style={{ fontFamily: branding.fontFamily }}>
      <div style={{ position: "absolute", left: 90, right: 90, top: "50%", transform: "translateY(-50%)" }}>
        <div style={{ color: accent, fontWeight: 700, fontSize: 22, letterSpacing: 6, marginBottom: 18 }}>
          {content.category.toUpperCase()}
        </div>
        <div style={{ ...reveal, color: "#fff", fontSize: 72, fontWeight: 300, lineHeight: 1.25, letterSpacing: -1 }}>
          {content.headline}
        </div>
        <div style={{ ...underline, height: 4, width: 180, background: accent, marginTop: 24 }} />
        {content.subtitle ? (
          <div style={{ ...metaFade, color: "#cbd5e1", fontSize: 26, marginTop: 24, fontWeight: 400 }}>
            {content.subtitle}
          </div>
        ) : null}
        <div style={{ ...metaFade, color: "#94a3b8", fontSize: 20, marginTop: 16, letterSpacing: 1 }}>
          {content.reporter}  ·  {content.location}  ·  {formatDateTime(content.date, content.time)}
        </div>
      </div>
    </AbsoluteFill>
  );
};
