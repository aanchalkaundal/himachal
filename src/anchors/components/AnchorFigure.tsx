import React from "react";
import type { AnchorRenderState, ColorProfile } from "@/anchors/types";

/** Optional attire/accessories that differentiate rigs without new geometry. */
export interface Attire {
  tie?: boolean;
  cap?: "himachali" | "none";
  capColor?: string;
  glasses?: boolean;
  scarf?: boolean;
  scarfColor?: string;
}

interface AnchorFigureProps {
  state: AnchorRenderState;
  colors: ColorProfile;
  attire?: Attire;
}

/**
 * Shared, parametric SVG news-anchor rig — a head-and-shoulders "bust". Every
 * anchor package renders through this one component, differing only by `colors`
 * + `attire`. All motion is driven by the passed `state` (a pure function of
 * frame elsewhere), so the rig is stateless and deterministic — safe for both
 * preview and headless render. The renderer scales/positions the whole svg.
 */
export const AnchorFigure: React.FC<AnchorFigureProps> = ({ state, colors, attire = {} }) => {
  const { skin, hair, outfitPrimary, outfitSecondary, accent } = colors;
  const { tie = true, cap = "none", capColor = "#7a1f2b", glasses = false, scarf = false, scarfColor = "#c02942" } =
    attire;

  const lid = (1 - state.eyesOpen) * 11; // eyelid drop
  const browY = 128 - state.browRaise * 7;
  const browAngle = state.browAngle ?? 0; // inner-tilt for sad/angry
  const browPivotY = browY + 3.5;
  const mouthH = 3 + state.mouthOpen * 17;
  const smileDip = state.smile * 7; // negative = frown
  const headShift = state.sway * 0.5;
  const armDeg = state.armAngle;

  return (
    <svg viewBox="0 0 300 460" width="100%" height="100%" style={{ overflow: "visible" }}>
      {/* Torso / suit */}
      <g>
        <path d="M34 460 L34 322 Q150 286 266 322 L266 460 Z" fill={outfitPrimary} />
        <path d="M34 460 L34 344 Q78 322 104 330 L120 460 Z" fill={outfitSecondary} opacity={0.5} />
        <path d="M266 460 L266 344 Q222 322 196 330 L180 460 Z" fill={outfitSecondary} opacity={0.5} />
        {/* Collar */}
        <path d="M116 300 L150 344 L184 300 L172 288 L150 318 L128 288 Z" fill="#f8fafc" />
        {tie ? <path d="M150 344 L140 366 L150 430 L160 366 Z" fill={accent} /> : null}
        {scarf ? <path d="M110 302 Q150 330 190 302 L190 328 Q150 356 110 328 Z" fill={scarfColor} /> : null}
      </g>

      {/* Right arm (viewer-left), pivots at the shoulder for gesture/wave */}
      <g transform={`translate(258 330) rotate(${-armDeg}) translate(-258 -330)`}>
        <rect x="246" y="322" width="28" height="104" rx="14" fill={outfitPrimary} />
        <circle cx="260" cy="426" r="16" fill={skin} />
      </g>

      {/* Head group: sway + nod */}
      <g transform={`translate(${headShift} ${state.nod})`}>
        {/* Neck */}
        <rect x="124" y="232" width="52" height="80" rx="18" fill={skin} />
        <path d="M124 244 Q150 264 176 244 L176 252 Q150 274 124 252 Z" fill="rgba(0,0,0,0.10)" />

        {/* Head */}
        <circle cx="150" cy="150" r="92" fill={skin} />
        <circle cx="56" cy="158" r="14" fill={skin} />
        <circle cx="244" cy="158" r="14" fill={skin} />

        {/* Hair */}
        <path d="M58 130 Q150 26 242 130 Q234 82 150 76 Q66 82 58 130 Z" fill={hair} />
        {cap === "himachali" ? (
          <g>
            <path d="M52 116 Q150 62 248 116 L248 132 Q150 100 52 132 Z" fill={capColor} />
            <rect x="52" y="116" width="196" height="16" fill={accent} opacity={0.9} />
          </g>
        ) : null}

        {/* Eyebrows — inner ends tilt for emotion (sad = inner up, angry = down) */}
        <rect
          x="98"
          y={browY}
          width="44"
          height="7"
          rx="3.5"
          fill={hair}
          transform={`rotate(${browAngle} 142 ${browPivotY})`}
        />
        <rect
          x="158"
          y={browY}
          width="44"
          height="7"
          rx="3.5"
          fill={hair}
          transform={`rotate(${-browAngle} 158 ${browPivotY})`}
        />

        {/* Eyes */}
        <g>
          <ellipse cx="120" cy="150" rx="18" ry="12" fill="#fff" />
          <ellipse cx="180" cy="150" rx="18" ry="12" fill="#fff" />
          <circle cx="120" cy="151" r="6" fill="#1f2937" />
          <circle cx="180" cy="151" r="6" fill="#1f2937" />
          {/* Eyelids */}
          <rect x="102" y={138} width="36" height={lid} fill={skin} />
          <rect x="162" y={138} width="36" height={lid} fill={skin} />
          {glasses ? (
            <g stroke="#1f2937" strokeWidth={3.5} fill="none">
              <rect x="100" y="136" width="40" height="30" rx="9" />
              <rect x="160" y="136" width="40" height="30" rx="9" />
              <line x1="140" y1="150" x2="160" y2="150" />
            </g>
          ) : null}
        </g>

        {/* Nose */}
        <path d="M150 158 L142 190 Q150 197 158 190 Z" fill={skin} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />

        {/* Mouth */}
        <path
          d={`M124 210 Q150 ${210 + smileDip} 176 210 Q150 ${210 + smileDip + mouthH} 124 210 Z`}
          fill="#7f1d1d"
        />
      </g>
    </svg>
  );
};
