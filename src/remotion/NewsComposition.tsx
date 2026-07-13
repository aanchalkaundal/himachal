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
import { AudioTimeline } from "@/remotion/components/AudioTimeline";
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

import type { SocialConfig } from "@/types/project";
import type { Timeline, TimelineScene } from "@/lib/timeline/types";

/**
 * Compute the frame windows the social overlay appears in: recurring every
 * `repeatEverySeconds` (from `showAtSeconds`), plus the whole intro/outro scenes
 * when enabled. Each window is clamped to the video length.
 */
function buildSocialWindows(
  social: SocialConfig,
  timeline: Timeline,
  introScene?: TimelineScene,
  outroScene?: TimelineScene,
): Array<{ from: number; dur: number }> {
  const { fps, totalDurationInFrames: total } = timeline;
  const durF = Math.max(1, Math.round((social.durationSeconds || 1) * fps));
  const windows: Array<{ from: number; dur: number }> = [];

  const startS = Math.max(0, social.showAtSeconds || 0);
  const everyS = social.repeatEverySeconds > 0 ? social.repeatEverySeconds : 0;
  for (let t = startS; t * fps < total; t += everyS || total) {
    const from = Math.round(t * fps);
    windows.push({ from, dur: Math.min(durF, total - from) });
    if (!everyS) break; // show once
  }

  if (social.showInIntroOutro) {
    if (introScene) windows.push({ from: introScene.startFrame, dur: introScene.durationInFrames });
    if (outroScene) windows.push({ from: outroScene.startFrame, dur: outroScene.durationInFrames });
  }

  return windows.filter((w) => w.dur > 0 && w.from < total);
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
      {/* Chroma-key filter for green-screen VIDEO slides. Alpha carries a
          "greenness" score = G − (R+B)/2, which is high ONLY for true green and
          low for skin / gray / yellow / cyan — so it removes green without eating
          other colors. A threshold sharpens it. Ref: filter: url(#nvg-greenscreen). */}
      <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
        <defs>
          <filter id="nvg-greenscreen" colorInterpolationFilters="sRGB">
            {/* 1. Put a "greenness" score (G − (R+B)/2) into alpha; keep RGB. */}
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      -0.5 1 -0.5 0 0"
              result="green"
            />
            {/* 2. Threshold with a SOFT edge: strong green (≳0.4) → transparent,
                   the ~0.3 fringe band → semi-transparent so edges blend instead of
                   showing a hard green rim. Skin (greenness ≈ 0) stays opaque. */}
            <feComponentTransfer in="green" result="mask">
              <feFuncA type="discrete" tableValues="1 1 1 0.5 0 0 0 0 0 0" />
            </feComponentTransfer>
            {/* 3. Spill suppression: pull the green channel toward the R/B average,
                   killing the green tint on the kept edge pixels. */}
            <feColorMatrix
              in="mask"
              type="matrix"
              values="1 0 0 0 0
                      0.2 0.6 0.2 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
            />
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

      {/* Social handles overlay — recurring every N seconds + during intro/outro */}
      {project.social?.enabled
        ? buildSocialWindows(project.social, timeline, introScene, outroScene).map((w, i) => (
            <Sequence key={`social-${i}`} from={w.from} durationInFrames={w.dur}>
              <SocialBar social={project.social} accent={theme.accent} durationInFrames={w.dur} />
            </Sequence>
          ))
        : null}

      {/* 4. Audio — background/intro/outro mix + the audio timeline clips */}
      <AudioTimeline clips={project.audioClips ?? []} master={Math.max(0, Math.min(1, project.audio.masterVolume))} />
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
