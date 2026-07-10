import type { TemplateId } from "@/types/project";
import type { TemplateDefinition } from "./types";
import { BreakingNews } from "./BreakingNews";
import { ModernNews } from "./ModernNews";
import { BusinessNews } from "./BusinessNews";
import { MinimalNews } from "./MinimalNews";
import { CinematicPrime } from "./CinematicPrime";
import { LiveBulletin } from "./LiveBulletin";
import { DataPulse } from "./DataPulse";
import { SportsSpotlight } from "./SportsSpotlight";

/**
 * The template engine.
 *
 * Adding a new template is a one-line registration here plus its component
 * file — nothing else in the app needs to change. The editor's picker, the
 * preview, and the renderer all resolve templates through this registry, which
 * is what makes the "unlimited future templates" requirement cheap to satisfy.
 */
export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  "breaking-news": {
    id: "breaking-news",
    name: "Breaking News",
    description: "High-energy red banner with animated BREAKING flag and reveal headline.",
    defaultDurationInSeconds: 10,
    component: BreakingNews,
  },
  "modern-news": {
    id: "modern-news",
    name: "Modern News",
    description: "Clean glass panel with accent rail and description block.",
    defaultDurationInSeconds: 12,
    component: ModernNews,
  },
  "business-news": {
    id: "business-news",
    name: "Business News",
    description: "Split corporate layout with a solid headline column.",
    defaultDurationInSeconds: 12,
    component: BusinessNews,
  },
  "minimal-news": {
    id: "minimal-news",
    name: "Minimal News",
    description: "Typography-forward editorial look with restrained motion.",
    defaultDurationInSeconds: 10,
    component: MinimalNews,
  },
  "cinematic-prime": {
    id: "cinematic-prime",
    name: "Cinematic Prime",
    description: "Film-grade letterbox bars, clip-reveal headline and a progress underline.",
    defaultDurationInSeconds: 12,
    component: CinematicPrime,
  },
  "live-bulletin": {
    id: "live-bulletin",
    name: "Live Bulletin",
    description: "On-air studio look with a pulsing LIVE badge and gradient glass panel.",
    defaultDurationInSeconds: 12,
    component: LiveBulletin,
  },
  "data-pulse": {
    id: "data-pulse",
    name: "Data Pulse",
    description: "Finance/markets aesthetic with a gradient headline and animated stat chips.",
    defaultDurationInSeconds: 12,
    component: DataPulse,
  },
  "sports-spotlight": {
    id: "sports-spotlight",
    name: "Sports Spotlight",
    description: "High-impact stadium energy with a skewed accent slab and oversized headline.",
    defaultDurationInSeconds: 10,
    component: SportsSpotlight,
  },
};

export const TEMPLATE_LIST: TemplateDefinition[] = Object.values(TEMPLATES);

export function getTemplate(id: TemplateId): TemplateDefinition {
  return TEMPLATES[id] ?? TEMPLATES["breaking-news"];
}
