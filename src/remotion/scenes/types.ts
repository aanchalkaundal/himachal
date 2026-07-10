import type React from "react";
import type { NewsProject } from "@/types/project";
import type { TimelineScene, SceneKind } from "@/lib/timeline/types";
import type { Theme } from "@/remotion/theme";

/** Props every scene component receives. */
export interface SceneProps {
  project: NewsProject;
  scene: TimelineScene;
  theme: Theme;
}

export type SceneComponent = React.FC<SceneProps>;

export type SceneRegistry = Record<SceneKind, SceneComponent>;
