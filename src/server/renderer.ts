import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import http from "node:http";
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

const MIME_BY_EXT: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
};
const mimeForFile = (file: string) => MIME_BY_EXT[path.extname(file).toLowerCase()] || "application/octet-stream";

/**
 * A tiny local HTTP server (with Range support, needed for video seeking) that
 * serves the materialized asset files. Remotion's renderer only accepts http(s)
 * URLs, so materialized data-URLs are served from here. Started once per process.
 */
const gAsset = globalThis as unknown as { __nvgAssetPort?: number; __nvgAssetPromise?: Promise<number> };
function ensureAssetServer(): Promise<number> {
  if (gAsset.__nvgAssetPort) return Promise.resolve(gAsset.__nvgAssetPort);
  if (gAsset.__nvgAssetPromise) return gAsset.__nvgAssetPromise;
  gAsset.__nvgAssetPromise = new Promise<number>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const name = path.basename(decodeURIComponent((req.url || "/").split("?")[0]));
        const file = path.join(ASSET_DIR, name);
        if (!name || !fs.existsSync(file)) {
          res.statusCode = 404;
          return res.end("not found");
        }
        const stat = fs.statSync(file);
        const type = mimeForFile(file);
        const range = req.headers.range;
        if (range) {
          const m = /bytes=(\d*)-(\d*)/.exec(range);
          let start = m && m[1] ? parseInt(m[1], 10) : 0;
          let end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
          if (Number.isNaN(start)) start = 0;
          if (Number.isNaN(end) || end >= stat.size) end = stat.size - 1;
          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": end - start + 1,
            "Content-Type": type,
          });
          fs.createReadStream(file, { start, end }).pipe(res);
        } else {
          res.writeHead(200, { "Content-Length": stat.size, "Content-Type": type, "Accept-Ranges": "bytes" });
          fs.createReadStream(file).pipe(res);
        }
      } catch (e) {
        res.statusCode = 500;
        res.end(String(e));
      }
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      gAsset.__nvgAssetPort = (server.address() as { port: number }).port;
      resolve(gAsset.__nvgAssetPort);
    });
  });
  return gAsset.__nvgAssetPromise;
}

/** Write a `data:` URL to a real file, return an http URL served by the asset
 * server. (Remotion only fetches http(s); big data URLs fail through its proxy.) */
function dataUrlToUrl(src: string, port: number, cache: Map<string, string>): string {
  const cached = cache.get(src);
  if (cached) return cached;
  const m = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(src);
  if (!m) return src;
  const mime = m[1] || "application/octet-stream";
  const isB64 = Boolean(m[2]);
  const buf = isB64 ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]));
  const ext = (mime.split("/")[1] || "bin").split("+")[0].replace(/[^a-z0-9]/gi, "") || "bin";
  const name = `${crypto.createHash("md5").update(src).digest("hex")}.${ext}`;
  const file = path.join(ASSET_DIR, name);
  if (!fs.existsSync(file)) fs.writeFileSync(file, buf);
  const url = `http://127.0.0.1:${port}/${name}`;
  cache.set(src, url);
  return url;
}

/** Deep-clone the project, replacing every embedded `data:` URL with an http URL. */
function materializeMedia(project: NewsProject, port: number): NewsProject {
  const cache = new Map<string, string>();
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return v.startsWith("data:") ? dataUrlToUrl(v, port, cache) : v;
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

  // Materialize embedded data-URL media to real files served over http so
  // OffthreadVideo/Img/Audio load them reliably (large data URLs fail through
  // Remotion's proxy; Remotion only accepts http(s) URLs, not file://).
  const assetPort = await ensureAssetServer();
  const renderProps = materializeMedia(project, assetPort);

  const composition = await selectComposition({
    serveUrl,
    id: NEWS_COMPOSITION_ID,
    inputProps: { project: renderProps },
  });
  job.totalFrames = composition.durationInFrames;

  const format = project.settings.format;
  const outputLocation = path.join(OUTPUT_DIR, `${job.id}.${EXT[format]}`);

  // Parallel frame rendering, but capped by RAM: each headless tab needs a lot of
  // memory (more at 4K), so over-committing makes the machine swap and render
  // SLOWER, not faster. Take the smaller of a CPU-based and a RAM-based cap.
  const cores = Math.max(1, os.cpus()?.length || 4);
  const totalGB = os.totalmem() / 1e9;
  const heavy = getRenderScale(project.settings.resolution) >= 2; // 2K/4K need more RAM/tab
  const ramCap = Math.max(2, Math.floor(totalGB / (heavy ? 3 : 2))); // ~1 tab per 2–3 GB
  const envConc = Number(process.env.NVG_CONCURRENCY);
  const concurrency =
    Number.isFinite(envConc) && envConc > 0
      ? Math.floor(envConc)
      : Math.max(2, Math.min(Math.floor(cores * 0.9), ramCap));

  // GPU-accelerate the headless browser: by default Chromium renders on the CPU
  // (SwiftShader), which is very slow for CSS/SVG filters (green-screen key),
  // transforms and 4K. "angle" uses the real GPU (D3D on Windows) → big speedup.
  // Override with NVG_GL=swiftshader if a machine has GPU driver issues.
  const gl = (process.env.NVG_GL as "angle" | "swiftshader" | "swangle" | "egl" | "vulkan" | undefined) || "angle";

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
    // Parallelism + GPU + a fast x264 preset + a big video cache = quicker exports.
    concurrency,
    chromiumOptions: { gl },
    ...(format === "mp4" ? { x264Preset: "veryfast" as const } : {}),
    offthreadVideoCacheSizeInBytes: 512 * 1024 * 1024,
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
