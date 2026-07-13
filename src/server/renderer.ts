import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import crypto from "node:crypto";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderMedia, ensureBrowser, makeCancelSignal } from "@remotion/renderer";
import type { NewsProject } from "@/types/project";
import { getRenderScale } from "@/types/project";
import { NEWS_COMPOSITION_ID } from "@/remotion/constants";
import type { RenderJob } from "./renderTypes";

/** Directory where finished renders are written. */
export const OUTPUT_DIR = path.join(os.tmpdir(), "nvg-renders");
/** Where inlined media (data URLs) are materialized to real files for rendering. */
const ASSET_DIR = path.join(OUTPUT_DIR, "assets");

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!fs.existsSync(ASSET_DIR)) fs.mkdirSync(ASSET_DIR, { recursive: true });
}

/**
 * Write a `data:` URL to a real file and return a `file://` URL. OffthreadVideo
 * (and Img/Audio) fetch big base64 data URLs through Remotion's proxy, which
 * fails/times out for large videos ("Failed to fetch .../proxy"). Serving real
 * files renders reliably and keeps memory down.
 */
function dataUrlToFile(src: string, cache: Map<string, string>): string {
  const cached = cache.get(src);
  if (cached) return cached;
  const m = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(src);
  if (!m) return src;
  const mime = m[1] || "application/octet-stream";
  const isB64 = Boolean(m[2]);
  const buf = isB64 ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]));
  const ext = (mime.split("/")[1] || "bin").split("+")[0].replace(/[^a-z0-9]/gi, "") || "bin";
  const file = path.join(ASSET_DIR, `${crypto.createHash("md5").update(src).digest("hex")}.${ext}`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, buf);
  const url = `file://${file.replace(/\\/g, "/")}`;
  cache.set(src, url);
  return url;
}

/** Deep-clone the project, replacing every embedded `data:` URL with a file URL. */
function materializeMedia(project: NewsProject): NewsProject {
  const cache = new Map<string, string>();
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return v.startsWith("data:") ? dataUrlToFile(v, cache) : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) out[k] = walk(val);
      return out;
    }
    return v;
  };
  return walk(project) as NewsProject;
}

// ---- Bundle caching: the Remotion bundle is compiled once per process. ----
let bundlePromise: Promise<string> | null = null;

function getBundle(): Promise<string> {
  if (!bundlePromise) {
    // Packaged desktop app: use the pre-built Remotion bundle (no source / webpack
    // needed at runtime). Set by the Electron main process.
    const prebuilt = process.env.REMOTION_SERVE_DIR;
    if (prebuilt && fs.existsSync(path.join(prebuilt, "index.html"))) {
      bundlePromise = Promise.resolve(prebuilt);
      return bundlePromise;
    }
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

  // Materialize embedded data-URL media to real files so OffthreadVideo/Img/Audio
  // load them reliably (large data URLs fail through Remotion's proxy).
  const renderProps = materializeMedia(project);

  const composition = await selectComposition({
    serveUrl,
    id: NEWS_COMPOSITION_ID,
    inputProps: { project: renderProps },
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
    inputProps: { project: renderProps },
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
