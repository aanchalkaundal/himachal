import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type { TransitionPresentation } from "@remotion/transitions";
import type { NewsProject } from "@/types/project";
import type { TransitionType } from "@/lib/timeline/types";
import { buildTimeline } from "@/lib/timeline/buildTimeline";
import { getTheme } from "@/remotion/theme";
import { SceneStage } from "@/remotion/SceneStage";
import { LogoBadge } from "@/remotion/components/LogoBadge";
import { SocialBar } from "@/remotion/components/SocialBar";
import { Watermark } from "@/remotion/components/Watermark";
import { AudioLayer } from "@/remotion/components/AudioLayer";
import { NEWS_COMPOSITION_ID } from "@/remotion/constants";

export { NEWS_COMPOSITION_ID };

/** Resolve a transition type to a Remotion presentation. */
function presentationFor(type: TransitionType): TransitionPresentation<Record<string, unknown>> | null {
  switch (type) {
    case "fade":
      return fade();
    case "slide":
      return slide();
    case "wipe":
      return wipe();
    case "none":
      return null;
  }
}

/**
 * The single composition rendered by BOTH the live preview (@remotion/player)
 * and the server renderer — guaranteeing pixel-for-pixel parity.
 *
 * Layers (bottom → top):
 *   1. Persistent themed background
 *   2. Scene timeline (TransitionSeries) — intro / headline / body… / outro
 *   3. Persistent overlays: logo, watermark, ticker
 *   4. Audio mixer
 */
export const NewsComposition: React.FC<{ project: NewsProject }> = ({ project }) => {
  const timeline = buildTimeline(project);
  const theme = getTheme(project);

  const introScene = timeline.scenes.find((s) => s.kind === "intro");
  const outroScene = timeline.scenes.find((s) => s.kind === "outro");

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Chroma-key filter for green-screen VIDEO slides (alpha = R − G + B, then
          thresholded). Referenced via `filter: url(#nvg-greenscreen)`. */}
      <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
        <defs>
          <filter id="nvg-greenscreen" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      1 -1 1 0 0"
              result="keyed"
            />
            <feComponentTransfer in="keyed">
              <feFuncA type="discrete" tableValues="0 0 0 0 1 1 1 1" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      {/* 1. Scene timeline — each scene renders its OWN background (per-scene media). */}
      <TransitionSeries>
        {timeline.scenes.map((scene, i) => {
          const transition = i > 0 ? timeline.transitions[i - 1] : null;
          const presentation = transition ? presentationFor(transition.type) : null;
          return (
            <React.Fragment key={scene.id}>
              {presentation && transition && transition.durationInFrames > 0 ? (
                <TransitionSeries.Transition
                  presentation={presentation}
                  timing={linearTiming({ durationInFrames: transition.durationInFrames })}
                />
              ) : null}
              <TransitionSeries.Sequence durationInFrames={scene.durationInFrames}>
                <SceneStage project={project} scene={scene} theme={theme} />
              </TransitionSeries.Sequence>
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      {/* 3. Persistent overlays (ticker is now per-scene, inside SceneStage) */}
      <LogoBadge logo={project.media.logo} channelName={project.branding.channelName} accent={theme.accent} />
      <Watermark text={project.branding.watermark} bottom={116} />

      {/* Social handles overlay — appears only in the user-chosen time window */}
      {project.social?.enabled ? (
        <Sequence
          from={Math.max(0, Math.round((project.social.showAtSeconds || 0) * timeline.fps))}
          durationInFrames={Math.max(1, Math.round((project.social.durationSeconds || 1) * timeline.fps))}
        >
          <SocialBar
            social={project.social}
            accent={theme.accent}
            durationInFrames={Math.max(1, Math.round((project.social.durationSeconds || 1) * timeline.fps))}
          />
        </Sequence>
      ) : null}

      {/* 4. Audio */}
      <AudioLayer
        project={project}
        totalDurationInFrames={timeline.totalDurationInFrames}
        fps={timeline.fps}
        introFrames={introScene?.durationInFrames ?? 0}
        outroStartFrame={outroScene?.startFrame ?? timeline.totalDurationInFrames}
        outroFrames={outroScene?.durationInFrames ?? 0}
      />
    </AbsoluteFill>
  );
};
