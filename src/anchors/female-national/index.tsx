import React from "react";
import { AnchorFigure } from "@/anchors/components/AnchorFigure";
import type { AnchorMetadata, AnchorRenderState } from "@/anchors/types";

/** National female news anchor in a tailored blazer. */
export const metadata: AnchorMetadata = {
  id: "female-national",
  name: "Female News Anchor",
  category: "national",
  description: "National female news anchor in a tailored blazer.",
  themeCompatibility: "all",
  supportedStudios: "all",
  defaultPosition: "bottom-left",
  defaultScale: 1,
  defaultLayer: "front",
  animationPresets: ["idle", "talking", "reading", "breaking", "serious", "intro", "outro", "smile", "listening"],
  colorProfile: { skin: "#f0c19c", hair: "#1c130d", outfitPrimary: "#2a1f3d", outfitSecondary: "#1c1530", accent: "#8b5cf6" },
  thumbnailColor: "#2a1f3d",
};

export const Character: React.FC<{ state: AnchorRenderState }> = ({ state }) => (
  <AnchorFigure state={state} colors={metadata.colorProfile} attire={{ tie: false }} />
);

export default Character;
