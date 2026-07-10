import React from "react";
import { AnchorFigure } from "@/anchors/components/AnchorFigure";
import type { AnchorMetadata, AnchorRenderState } from "@/anchors/types";

/** National male news anchor in a formal suit and tie. */
export const metadata: AnchorMetadata = {
  id: "male-national",
  name: "Male News Anchor",
  category: "national",
  description: "National male news anchor in a formal suit and tie.",
  themeCompatibility: "all",
  supportedStudios: "all",
  defaultPosition: "bottom-right",
  defaultScale: 1,
  defaultLayer: "front",
  animationPresets: ["idle", "talking", "reading", "breaking", "serious", "intro", "outro", "point", "head-nod"],
  colorProfile: { skin: "#e6ac82", hair: "#12100e", outfitPrimary: "#1f2937", outfitSecondary: "#111827", accent: "#c0392b" },
  thumbnailColor: "#1f2937",
};

export const Character: React.FC<{ state: AnchorRenderState }> = ({ state }) => (
  <AnchorFigure state={state} colors={metadata.colorProfile} attire={{ tie: true }} />
);

export default Character;
