import React from "react";
import { AnchorFigure } from "@/anchors/components/AnchorFigure";
import type { AnchorMetadata, AnchorRenderState } from "@/anchors/types";

/** Weather presenter — friendly, light palette. */
export const metadata: AnchorMetadata = {
  id: "weather",
  name: "Weather Presenter",
  category: "weather",
  description: "Friendly weather presenter with an approachable look.",
  themeCompatibility: "all",
  supportedStudios: "all",
  defaultPosition: "center-left",
  defaultScale: 1,
  defaultLayer: "front",
  animationPresets: ["idle", "talking", "point", "hand-gesture", "smile", "intro", "outro", "listening"],
  colorProfile: { skin: "#eab690", hair: "#2a1c12", outfitPrimary: "#0ea5e9", outfitSecondary: "#0284c7", accent: "#fde047" },
  thumbnailColor: "#0ea5e9",
};

export const Character: React.FC<{ state: AnchorRenderState }> = ({ state }) => (
  <AnchorFigure state={state} colors={metadata.colorProfile} attire={{ tie: false }} />
);

export default Character;
