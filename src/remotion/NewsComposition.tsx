import React from "react";
import { AbsoluteFill } from "remotion";
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
import { NewsTicker } from "@/remotion/components/NewsTicker";
import { LogoBadge } from "@/remotion/components/LogoBadge";
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

  // The ticker scrolls the scenes' description text (split into sentences), so
  // "GROUND DETAILS" always reflects what the story is about. If no description
  // is written, fall back to the manually-typed ticker items.
  const descriptionItems = (project.storyScenes ?? [])
    .map((s) => s.content.description?.trim())
    .filter((d): d is string => Boolean(d))
    .flatMap((d) =>
      d
        .split(/\n+|(?<=[.!?])\s+/)
        .map((x) => x.trim())
        .filter(Boolean),
    );
  const ticker =
    descriptionItems.length > 0 ? { ...project.ticker, items: descriptionItems } : project.ticker;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
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

      {/* 3. Persistent overlays */}
      <LogoBadge logo={project.media.logo} channelName={project.branding.channelName} accent={theme.accent} />
      <Watermark text={project.branding.watermark} />
      <NewsTicker ticker={ticker} accent={theme.accent} />

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
