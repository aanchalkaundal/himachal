import { NextResponse } from "next/server";
import type { NewsProject } from "@/types/project";
import { enqueue, listPublic } from "@/server/renderQueue";

// Rendering uses native modules + a headless browser — Node runtime, no caching.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** GET /api/render → all jobs (public view) for the queue UI. */
export async function GET() {
  return NextResponse.json({ jobs: listPublic() });
}

/** POST /api/render { project } → enqueue a render, returns the job id. */
export async function POST(req: Request) {
  let project: NewsProject;
  try {
    const body = await req.json();
    project = body.project;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!project || !project.id || !project.settings) {
    return NextResponse.json({ error: "Missing or malformed project" }, { status: 400 });
  }
  const job = enqueue(project);
  return NextResponse.json({ id: job.id }, { status: 202 });
}
