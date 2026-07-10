import React from "react";
import { Img } from "remotion";
import { useZoomIn } from "@/remotion/animations/presets";

interface LogoBadgeProps {
  logo?: string;
  channelName: string;
  accent: string;
  corner?: "top-left" | "top-right";
}

/** Animated channel logo (or a text fallback) pinned to a top corner. */
export const LogoBadge: React.FC<LogoBadgeProps> = ({ logo, channelName, accent, corner = "top-right" }) => {
  const anim = useZoomIn({ delay: 8 });
  const pos = corner === "top-right" ? { right: 60 } : { left: 60 };
  return (
    <div style={{ position: "absolute", top: 50, ...pos, ...anim }}>
      {logo ? (
        <Img src={logo} style={{ height: 90, width: "auto", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.5))" }} />
      ) : (
        <div
          style={{
            background: accent,
            color: "#fff",
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: 1,
            padding: "10px 18px",
            borderRadius: 8,
            fontFamily: "Arial, Helvetica, sans-serif",
            boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
          }}
        >
          {channelName}
        </div>
      )}
    </div>
  );
};
