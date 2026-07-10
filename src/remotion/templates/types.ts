import type React from "react";
import type { NewsProject, TemplateId } from "@/types/project";

/** Every template receives the full project and renders one composition. */
export interface TemplateProps {
  project: NewsProject;
}

export type TemplateComponent = React.FC<TemplateProps>;

/** Registry metadata used by the editor's template picker. */
export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  /** Suggested duration; the editor may override via settings. */
  defaultDurationInSeconds: number;
  component: TemplateComponent;
}
