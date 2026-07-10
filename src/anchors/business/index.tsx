import React from "react";
import { AnchorFigure } from "@/anchors/components/AnchorFigure";
import type { AnchorMetadata, AnchorRenderState } from "@/anchors/types";

/** Business presenter — corporate suit, glasses. */
export const metadata: AnchorMetadata = {
  id: "business",
  name: "Business Presenter",
  category: "business",
  description: "Corporate presenter in a sharp suit with glasses.",
  themeCompatibility: ["business-news", "modern-news", "minimal-news"],
  supportedStudios: "all",
  defaultPosition: "center-right",
  defaultScale: 1,
  defaultLayer: "front",
  animationPresets: ["idle", "talking", "reading", "point", "serious", "intro", "outro", "head-nod"],
  colorProfile: { skin: "#e2a578", hair: "#20160f", outfitPrimary: "#0b3d5c", outfitSecondary: "#082c42", accent: "#38bdf8" },
  thumbnailColor: "#0b3d5c",
};

export const Character: React.FC<{ state: AnchorRenderState }> = ({ state }) => (
  <AnchorFigure state={state} colors={metadata.colorProfile} attire={{ tie: true, glasses: true }} />
);

export default Character;
