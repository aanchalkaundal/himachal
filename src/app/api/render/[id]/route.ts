import { NextResponse } from "next/server";
import { getJob, cancel, retry, remove } from "@/server/renderQueue";
import { toPublic } from "@/server/renderTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/render/:id → single job status (polled for live progress). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job: toPublic(job, Date.now()) });
}

/** POST /api/render/:id { action: "cancel" | "retry" } */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { action } = await req.json().catch(() => ({ action: undefined }));
  const ok = action === "cancel" ? cancel(id) : action === "retry" ? retry(id) : false;
  if (!ok) return NextResponse.json({ error: `Cannot ${action} this job` }, { status: 409 });
  const job = getJob(id);
  return NextResponse.json({ job: job ? toPublic(job, Date.now()) : null });
}

/** DELETE /api/render/:id → cancel if running, delete output, forget job. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ok = remove(id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
