import fs from "node:fs";
import { getJob } from "@/server/renderQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME = { mp4: "video/mp4", webm: "video/webm" } as const;

/** GET /api/render/:id/download → stream the finished video as an attachment. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job || !job.outputPath || !fs.existsSync(job.outputPath)) {
    return new Response("Render not ready", { status: 404 });
  }
  const data = fs.readFileSync(job.outputPath);
  const safeName = job.projectName.replace(/[^a-z0-9_-]+/gi, "_") || "news-video";
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": MIME[job.format],
      "Content-Length": String(data.length),
      "Content-Disposition": `attachment; filename="${safeName}.${job.format}"`,
      "Cache-Control": "no-store",
    },
  });
}
