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

  // Loop period must cover the ENTIRE message (plus a gap), otherwise a long
  // description gets cut off after ~2×width and never fully scrolls. We estimate
  // the rendered text width (generously, so copies never overlap) and place a
  // second copy exactly one period later for a seamless wrap.
  const GAP = 120;
  const CHAR_W = 14; // generous avg px/char at 24px bold
  const contentWidth = Math.max(width, message.length * CHAR_W);
  const period = contentWidth + GAP;
  const distance = (ticker.speed * seconds) % period;

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
      <div style={{ flex: 1, overflow: "hidden", position: "relative", display: "flex", alignItems: "center" }}>
        <div
          style={{
            position: "relative",
            height: 24,
            color: "#fff",
            fontSize: 24,
            fontWeight: 600,
            transform: `translateX(${width - distance}px)`,
          }}
        >
          {/* Two copies exactly one period apart → seamless loop, full message shown. */}
          <span style={{ position: "absolute", left: 0, whiteSpace: "nowrap" }}>{message}</span>
          <span style={{ position: "absolute", left: period, whiteSpace: "nowrap" }}>{message}</span>
        </div>
      </div>
    </div>
  );
};
