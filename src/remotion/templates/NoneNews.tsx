import React from "react";
import type { TemplateProps } from "./types";

/**
 * "None" template — renders no foreground graphics at all. Use it when you only
 * want the background media (image / video / green-screen anchor / text card),
 * the ticker, logo and anchors, with no headline/lower-third overlay.
 */
export const NoneNews: React.FC<TemplateProps> = () => null;
