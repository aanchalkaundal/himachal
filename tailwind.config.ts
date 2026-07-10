import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/remotion/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral UI surface palette for the app chrome (distinct from video theme colors).
        surface: {
          DEFAULT: "#0b0f17",
          raised: "#131926",
          border: "#1f2937",
        },
        accent: {
          DEFAULT: "#e11d2a",
          soft: "#f43f5e",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
