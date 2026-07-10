import React from "react";
import { useFadeIn } from "@/remotion/animations/presets";

/** Faint channel watermark, bottom-right, above the ticker area. */
export const Watermark: React.FC<{ text: string; bottom?: number }> = ({ text, bottom = 80 }) => {
  const fade = useFadeIn({ delay: 20, duration: 30 });
  if (!text) return null;
  return (
    <div
      style={{
        position: "absolute",
        right: 28,
        bottom,
        color: "rgba(255,255,255,0.35)",
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: 2,
        fontFamily: "Arial, Helvetica, sans-serif",
        ...fade,
      }}
    >
      {text}
    </div>
  );
};
