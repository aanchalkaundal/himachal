import React from "react";
import { AnchorFigure } from "@/anchors/components/AnchorFigure";
import type { AnchorMetadata, AnchorRenderState } from "@/anchors/types";

/** Regional male anchor with a Himachali topi. Self-contained package. */
export const metadata: AnchorMetadata = {
  id: "male-himachali",
  name: "Himachali Male",
  category: "regional",
  description: "Regional male anchor with a Himachali topi.",
  themeCompatibility: "all",
  supportedStudios: "all",
  defaultPosition: "bottom-right",
  defaultScale: 1,
  defaultLayer: "front",
  animationPresets: ["idle", "talking", "reading", "wave", "intro", "outro", "smile", "serious", "breaking"],
  colorProfile: { skin: "#e8b48c", hair: "#241a13", outfitPrimary: "#3f4d3a", outfitSecondary: "#2c3729", accent: "#b5892b" },
  thumbnailColor: "#7a1f2b",
};

export const Character: React.FC<{ state: AnchorRenderState }> = ({ state }) => (
  <AnchorFigure state={state} colors={metadata.colorProfile} attire={{ tie: false, cap: "himachali", capColor: "#7a1f2b" }} />
);

export default Character;
