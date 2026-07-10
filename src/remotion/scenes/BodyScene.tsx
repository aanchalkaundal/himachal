import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneProps } from "./types";
import { useSlideIn, useFadeIn } from "@/remotion/animations/presets";

/** News-body scene: one paragraph of the description with a progress indicator. */
export const BodyScene: React.FC<SceneProps> = ({ project, scene, theme }) => {
  const heading = useSlideIn("left", { delay: 4, duration: 20 });
  const bodyFade = useFadeIn({ delay: 14, duration: 22 });
  const paragraph = scene.data?.paragraph ?? project.content.description;
  const index = scene.data?.paragraphIndex ?? 0;
  const count = scene.data?.paragraphCount ?? 1;

  return (
    <AbsoluteFill style={{ fontFamily: theme.font, justifyContent: "center", padding: "0 90px" }}>
      <div style={{ ...heading, display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
        <div style={{ width: 10, height: 44, background: theme.accent, borderRadius: 4 }} />
        <div style={{ color: theme.accent, fontSize: 22, fontWeight: 800, letterSpacing: 3 }}>
          {project.content.category}
        </div>
      </div>
      <div style={{ ...bodyFade, color: "#f8fafc", fontSize: 44, lineHeight: 1.45, fontWeight: 500, maxWidth: 1400 }}>
        {paragraph}
      </div>
      {count > 1 ? (
        <div style={{ ...bodyFade, display: "flex", gap: 8, marginTop: 34 }}>
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === index ? 28 : 10,
                height: 10,
                borderRadius: 6,
                background: i === index ? theme.accent : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
