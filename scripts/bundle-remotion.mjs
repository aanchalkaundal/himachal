/**
 * Pre-bundle the Remotion composition to a static folder at BUILD time.
 *
 * The packaged desktop app doesn't ship `src/` (and can't run webpack at
 * runtime), so we bundle once here into `remotion-serve/`. The server renderer
 * uses this folder as its serveUrl (via REMOTION_SERVE_DIR) instead of bundling
 * on the fly. Run automatically by the desktop build.
 */
import path from "node:path";
import { bundle } from "@remotion/bundler";

const root = process.cwd();
const outDir = path.join(root, "remotion-serve");

const serveUrl = await bundle({
  entryPoint: path.join(root, "src", "remotion", "index.ts"),
  outDir,
  // The Remotion bundle runs its own webpack — re-declare the "@" → src alias.
  webpackOverride: (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias ?? {}),
        "@": path.join(root, "src"),
      },
    },
  }),
});

console.log("✓ Remotion bundled to:", serveUrl);
