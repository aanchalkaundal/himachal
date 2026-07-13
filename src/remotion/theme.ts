import type { NewsProject, TemplateId } from "@/types/project";

/** Resolved visual theme shared by the persistent background and all scenes. */
export interface Theme {
  from: string;
  to: string;
  scrim: number;
  accent: string;
  secondary: string;
  font: string;
}

/** Per-template background palette. Branding colors still override accents. */
const TEMPLATE_PALETTE: Record<TemplateId, { from: string; to: string; scrim: number }> = {
  // No template: no scrim either, so the raw background media shows undimmed.
  none: { from: "#0b0f17", to: "#020617", scrim: 0 },
  "breaking-news": { from: "#3a0000", to: "#111827", scrim: 0.45 },
  "modern-news": { from: "#0b1f3a", to: "#020617", scrim: 0.4 },
  "business-news": { from: "#0b1220", to: "#0b1220", scrim: 0.3 },
  "minimal-news": { from: "#0f172a", to: "#020617", scrim: 0.55 },
  "cinematic-prime": { from: "#1a1206", to: "#020617", scrim: 0.5 },
  "live-bulletin": { from: "#12002e", to: "#020617", scrim: 0.45 },
  "data-pulse": { from: "#04121f", to: "#010b14", scrim: 0.4 },
  "sports-spotlight": { from: "#132a12", to: "#020617", scrim: 0.42 },
};

export function getTheme(project: NewsProject): Theme {
  const pal = TEMPLATE_PALETTE[project.settings.templateId] ?? TEMPLATE_PALETTE["breaking-news"];
  return {
    ...pal,
    accent: project.branding.primaryColor,
    secondary: project.branding.secondaryColor,
    font: project.branding.fontFamily,
  };
}
