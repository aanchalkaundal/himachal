import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { SocialConfig } from "@/types/project";

/** Simple, recognizable platform icons (inline SVG, no external assets). */
const Icon: React.FC<{ platform: "youtube" | "instagram" | "facebook" | "x"; size?: number }> = ({
  platform,
  size = 34,
}) => {
  const s = size;
  switch (platform) {
    case "youtube":
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="4" y="12" width="40" height="24" rx="7" fill="#FF0000" />
          <path d="M21 19 L32 24 L21 29 Z" fill="#fff" />
        </svg>
      );
    case "instagram":
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <defs>
            <linearGradient id="ig" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#feda75" />
              <stop offset="0.5" stopColor="#d62976" />
              <stop offset="1" stopColor="#4f5bd5" />
            </linearGradient>
          </defs>
          <rect x="8" y="8" width="32" height="32" rx="9" fill="url(#ig)" />
          <circle cx="24" cy="24" r="8" fill="none" stroke="#fff" strokeWidth="3" />
          <circle cx="33" cy="15" r="2.4" fill="#fff" />
        </svg>
      );
    case "facebook":
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="18" fill="#1877F2" />
          <path d="M26.5 24 H30 L31 19 H26.5 V16.5 Q26.5 15 28.5 15 H31 V10.7 Q29 10.4 27 10.4 Q22 10.4 22 16 V19 H18 V24 H22 V37 H26.5 Z" fill="#fff" />
        </svg>
      );
    case "x":
      return (
        <svg width={s} height={s} viewBox="0 0 48 48">
          <rect x="6" y="6" width="36" height="36" rx="9" fill="#000" />
          <path d="M15 14 L27 30 M33 14 L21 30" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          <path d="M15 34 L21 26 M27 22 L33 14" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
  }
};

/**
 * On-screen social-handles overlay. Renders inside a timed <Sequence> so it only
 * appears for the window the user chose; it slides up + fades at both ends. Shows
 * only the platforms that have a handle. Purely presentational — no posting.
 */
export const SocialBar: React.FC<{ social: SocialConfig; accent: string; durationInFrames: number }> = ({
  social,
  accent,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rows = (
    [
      ["youtube", social.youtube],
      ["instagram", social.instagram],
      ["facebook", social.facebook],
      ["x", social.x],
    ] as const
  ).filter(([, handle]) => handle && handle.trim());

  if (rows.length === 0) return null;

  // Fade length — clamped so the 4-point input range is ALWAYS strictly
  // increasing (0 < inD < duration−inD < duration), even for very short windows.
  // Otherwise interpolate throws "inputRange must be strictly increasing".
  const inD = Math.max(0, Math.min(Math.round(fps * 0.4), Math.floor((durationInFrames - 1) / 2)));
  const opacity =
    inD <= 0
      ? 1
      : interpolate(frame, [0, inD, durationInFrames - inD, durationInFrames], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const rise =
    inD <= 0 ? 0 : (1 - interpolate(frame, [0, inD], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) * 40;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        [social.position === "top" ? "top" : "bottom"]: social.position === "top" ? 40 : 130,
        display: "flex",
        justifyContent: "center",
        opacity,
        transform: `translateY(${social.position === "top" ? -rise : rise}px)`,
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 14,
          padding: "12px 18px",
          borderRadius: 14,
          background: "rgba(8,12,20,0.82)",
          backdropFilter: "blur(6px)",
          border: `1px solid ${accent}55`,
          boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
          flexWrap: "wrap",
          maxWidth: "90%",
        }}
      >
        {rows.map(([platform, handle]) => (
          <div key={platform} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon platform={platform} />
            <span style={{ color: "#fff", fontSize: 26, fontWeight: 700, whiteSpace: "nowrap" }}>{handle}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
