import React from "react";
import type { SceneProps } from "./types";
import { getTemplate } from "@/remotion/templates/registry";

/**
 * Headline scene: delegates to the selected template's foreground layout. This
 * is what keeps template selection meaningful inside the scene timeline.
 */
export const HeadlineScene: React.FC<SceneProps> = ({ project }) => {
  const Template = getTemplate(project.settings.templateId).component;
  return <Template project={project} />;
};
