import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia, ensureBrowser, makeCancelSignal } from "@remotion/renderer";
import type { NewsProject } from "@/types/project";
import { getRenderScale } from "@/types/project";
import { NEWS_COMPOSITION_ID } from "@/remotion/constants";
import type { RenderJob } from "./renderTypes";

/** Directory where finished renders are written. */
export const OUTPUT_DIR = path.join(os.tmpdir(), "nvg-renders");

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ---- Bundle caching: the Remotion bundle is compiled once per process. ----
let bundlePromise: Promise<string> | null = null;

function getBundle(): Promise<string> {
  if (!bundlePromise) {
    const entryPoint = path.join(process.cwd(), "src", "remotion", "index.ts");
    bundlePromise = bundle({
      entryPoint,
      // The Remotion bundle runs its own webpack and doesn't know Next's tsconfig
      // path aliases, so re-declare "@" → src here.
      webpackOverride: (config) => ({
        ...config,
        resolve: {
          ...config.resolve,
          alias: {
            ...(config.resolve?.alias ?? {}),
            "@": path.join(process.cwd(), "src"),
          },
        },
      }),
    });
  }
  return bundlePromise;
}

const CODEC = { mp4: "h264", webm: "vp8" } as const;
const EXT = { mp4: "mp4", webm: "webm" } as const;

/**
 * Render a project to a real video file, driving `job` through its lifecycle
 * with honest progress. Throws on failure/cancel so the queue can classify the
 * outcome; the project is never mutated, so it survives any error for retry.
 */
export async function renderProject(job: RenderJob, project: NewsProject): Promise<string> {
  ensureOutputDir();
  const { cancelSignal, cancel } = makeCancelSignal();
  job.cancel = cancel;

  job.status = "preparing";
  job.startedAt = Date.now();

  // Make sure a headless browser is available (downloaded once, then cached).
  await ensureBrowser();
  const serveUrl = await getBundle();

  const composition = await selectComposition({
    serveUrl,
    id: NEWS_COMPOSITION_ID,
    inputProps: { project },
  });
  job.totalFrames = composition.durationInFrames;

  const format = project.settings.format;
  const outputLocation = path.join(OUTPUT_DIR, `${job.id}.${EXT[format]}`);

  job.status = "rendering";
  await renderMedia({
    composition,
    serveUrl,
    codec: CODEC[format],
    outputLocation,
    inputProps: { project },
    cancelSignal,
    // Composition is in the 1080p design space; scale up to the chosen resolution
    // (e.g. 2× → 4K). Layout stays identical, output is native high-res + crisp.
    scale: getRenderScale(project.settings.resolution),
    onProgress: ({ progress, renderedFrames, stitchStage }) => {
      job.progress = progress;
      job.renderedFrames = renderedFrames;
      // stitchStage flips to "encoding" once frames are captured and FFmpeg muxes.
      job.status = stitchStage === "encoding" ? "encoding" : "rendering";
    },
  });

  job.outputPath = outputLocation;
  job.progress = 1;
  job.status = "completed";
  job.finishedAt = Date.now();
  return outputLocation;
}
