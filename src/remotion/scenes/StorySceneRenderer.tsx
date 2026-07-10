import React from "react";
import type { SceneProps } from "./types";
import { getTemplate } from "@/remotion/templates/registry";

/**
 * Story scene: renders one user-authored timeline scene using its OWN template
 * and content. We shallow-clone the project so the chosen template (which reads
 * `project.content` + `project.settings.templateId`) sees this scene's data,
 * without touching any template code. This is what lets a single video mix
 * different templates/content per scene.
 */
export const StorySceneRenderer: React.FC<SceneProps> = ({ project, scene }) => {
  const story = scene.data?.storyScene;
  const scoped = story
    ? { ...project, content: story.content, settings: { ...project.settings, templateId: story.templateId } }
    : project;
  const Template = getTemplate(scoped.settings.templateId).component;
  return <Template project={scoped} />;
};
