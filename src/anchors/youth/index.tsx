import React from "react";
import { AnchorFigure } from "@/anchors/components/AnchorFigure";
import type { AnchorMetadata, AnchorRenderState } from "@/anchors/types";

/** Digital youth presenter — casual, modern. */
export const metadata: AnchorMetadata = {
  id: "youth",
  name: "Youth Presenter",
  category: "digital",
  description: "Casual digital-first presenter for social formats.",
  themeCompatibility: "all",
  supportedStudios: "all",
  defaultPosition: "bottom-right",
  defaultScale: 1,
  defaultLayer: "front",
  animationPresets: ["idle", "talking", "wave", "hand-gesture", "smile", "intro", "outro", "head-nod"],
  colorProfile: { skin: "#e9b48a", hair: "#0f0c0a", outfitPrimary: "#db2777", outfitSecondary: "#9d174d", accent: "#22d3ee" },
  thumbnailColor: "#db2777",
};

export const Character: React.FC<{ state: AnchorRenderState }> = ({ state }) => (
  <AnchorFigure state={state} colors={metadata.colorProfile} attire={{ tie: false, glasses: true }} />
);

export default Character;
