import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { TickerConfig } from "@/types/project";

interface NewsTickerProps {
  ticker: TickerConfig;
  accent: string;
  /** Bottom offset in px (templates may reserve space for a lower third). */
  bottom?: number;
}

/**
 * Editable, continuously scrolling ticker. The message string is duplicated so
 * the loop appears seamless; scroll position is derived from frame × speed for
 * deterministic, fps-independent motion.
 */
export const NewsTicker: React.FC<NewsTickerProps> = ({ ticker, accent, bottom = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  if (!ticker.enabled || ticker.items.length === 0) return null;

  const message = ticker.items.join("     ◆     ");
  const seconds = frame / fps;
  const distance = (ticker.speed * seconds) % (width * 2);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom,
        height: 64,
        display: "flex",
        alignItems: "stretch",
        background: "rgba(8,12,20,0.92)",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          background: accent,
          color: "#fff",
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: 1,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          whiteSpace: "nowrap",
          clipPath: "polygon(0 0, 100% 0, calc(100% - 18px) 100%, 0 100%)",
          paddingRight: 42,
        }}
      >
        {ticker.label}
      </div>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center" }}>
        <div
          style={{
            whiteSpace: "nowrap",
            color: "#fff",
            fontSize: 24,
            fontWeight: 600,
            transform: `translateX(${width - distance}px)`,
          }}
        >
          {message}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{message}
        </div>
      </div>
    </div>
  );
};
