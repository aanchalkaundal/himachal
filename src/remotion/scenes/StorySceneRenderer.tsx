import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneProps } from "./types";
import { getTemplate } from "@/remotion/templates/registry";

/** Seconds the headline/subtitle stay fully on screen before fading out. */
const HOLD_SECONDS = 4;
/** How long the fade-out itself takes. */
const FADE_SECONDS = 0.5;

/**
 * Story scene: renders one user-authored timeline scene using its OWN template
 * and content. We shallow-clone the project so the chosen template (which reads
 * `project.content` + `project.settings.templateId`) sees this scene's data,
 * without touching any template code.
 *
 * The template foreground (headline + subtitle, etc.) holds for HOLD_SECONDS and
 * then fades out, so the text is not on screen for the whole scene. Frame is
 * local to the scene's Sequence, so this timing restarts for every scene. The
 * per-scene background, ticker, logo and watermark are rendered elsewhere and are
 * unaffected.
 */
export const StorySceneRenderer: React.FC<SceneProps> = ({ project, scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const story = scene.data?.storyScene;
  const scoped = story
    ? { ...project, content: story.content, settings: { ...project.settings, templateId: story.templateId } }
    : project;
  const Template = getTemplate(scoped.settings.templateId).component;

  const opacity = interpolate(
    frame,
    [HOLD_SECONDS * fps, (HOLD_SECONDS + FADE_SECONDS) * fps],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      <Template project={scoped} />
    </AbsoluteFill>
  );
};
