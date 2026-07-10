import React from "react";
import { AnchorFigure } from "@/anchors/components/AnchorFigure";
import type { AnchorMetadata, AnchorRenderState } from "@/anchors/types";

/** Regional female anchor with a traditional scarf. */
export const metadata: AnchorMetadata = {
  id: "female-himachali",
  name: "Himachali Female",
  category: "regional",
  description: "Regional female anchor with a traditional scarf.",
  themeCompatibility: "all",
  supportedStudios: "all",
  defaultPosition: "bottom-left",
  defaultScale: 1,
  defaultLayer: "front",
  animationPresets: ["idle", "talking", "reading", "wave", "intro", "outro", "smile", "listening"],
  colorProfile: { skin: "#eebd9a", hair: "#1a120c", outfitPrimary: "#7a2740", outfitSecondary: "#5c1c30", accent: "#e0b64c" },
  thumbnailColor: "#c02942",
};

export const Character: React.FC<{ state: AnchorRenderState }> = ({ state }) => (
  <AnchorFigure state={state} colors={metadata.colorProfile} attire={{ tie: false, scarf: true, scarfColor: "#e0b64c" }} />
);

export default Character;
