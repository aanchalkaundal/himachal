import React from "react";
import { AnchorFigure } from "@/anchors/components/AnchorFigure";
import type { AnchorMetadata, AnchorRenderState } from "@/anchors/types";

/** Sports presenter — energetic, bright kit. */
export const metadata: AnchorMetadata = {
  id: "sports",
  name: "Sports Presenter",
  category: "sports",
  description: "High-energy sports presenter in a bright kit.",
  themeCompatibility: "all",
  supportedStudios: "all",
  defaultPosition: "bottom-right",
  defaultScale: 1,
  defaultLayer: "front",
  animationPresets: ["idle", "talking", "hand-gesture", "wave", "point", "intro", "outro", "smile", "breaking"],
  colorProfile: { skin: "#e6a980", hair: "#171310", outfitPrimary: "#059669", outfitSecondary: "#047857", accent: "#f59e0b" },
  thumbnailColor: "#059669",
};

export const Character: React.FC<{ state: AnchorRenderState }> = ({ state }) => (
  <AnchorFigure state={state} colors={metadata.colorProfile} attire={{ tie: false }} />
);

export default Character;
