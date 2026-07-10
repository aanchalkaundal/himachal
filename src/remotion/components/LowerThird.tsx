import React from "react";
import { useSlideIn, useBarGrow } from "@/remotion/animations/presets";

interface LowerThirdProps {
  reporter: string;
  location: string;
  accent: string;
  delay?: number;
}

/**
 * Reporter / location lower-third with a growing accent bar and a slide-in
 * name plate — a staple of broadcast news framing.
 */
export const LowerThird: React.FC<LowerThirdProps> = ({ reporter, location, accent, delay = 30 }) => {
  const bar = useBarGrow({ delay });
  const text = useSlideIn("left", { delay: delay + 6 });
  if (!reporter && !location) return null;

  return (
    <div style={{ position: "absolute", left: 60, bottom: 110, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div style={{ ...bar, height: 6, width: 260, background: accent, marginBottom: 8 }} />
      <div style={text}>
        <div style={{ color: "#fff", fontSize: 30, fontWeight: 800, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
          {reporter}
        </div>
        {location ? (
          <div style={{ color: "#e5e7eb", fontSize: 20, fontWeight: 600, marginTop: 2 }}>{location}</div>
        ) : null}
      </div>
    </div>
  );
};
