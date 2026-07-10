import fs from "node:fs";
import type { NewsProject } from "@/types/project";
import type { RenderJob, RenderJobPublic } from "./renderTypes";
import { toPublic } from "./renderTypes";
import { renderProject } from "./renderer";

/**
 * In-process render queue: FIFO, one active render at a time (renders are
 * memory-heavy, so serializing them keeps peak memory bounded while still
 * supporting many queued jobs). State is stashed on globalThis so Next.js dev
 * HMR doesn't wipe in-flight jobs.
 */
interface QueueState {
  jobs: Map<string, RenderJob>;
  order: string[];
  cancelled: Set<string>;
  running: boolean;
}

const g = globalThis as unknown as { __nvgQueue?: QueueState };
const state: QueueState =
  g.__nvgQueue ?? (g.__nvgQueue = { jobs: new Map(), order: [], cancelled: new Set(), running: false });

let counter = 0;
function newId(): string {
  counter += 1;
  return `job_${Date.now().toString(36)}_${counter}`;
}

export function enqueue(project: NewsProject): RenderJob {
  const job: RenderJob = {
    id: newId(),
    projectId: project.id,
    projectName: project.name,
    format: project.settings.format,
    status: "waiting",
    progress: 0,
    renderedFrames: 0,
    totalFrames: 0,
    startedAt: null,
    finishedAt: null,
    createdAt: Date.now(),
    error: null,
    outputPath: null,
    project,
  };
  state.jobs.set(job.id, job);
  state.order.push(job.id);
  void runNext();
  return job;
}

/** Pump the queue: render the next waiting job, then recurse. */
async function runNext(): Promise<void> {
  if (state.running) return;
  const next = state.order.map((id) => state.jobs.get(id)).find((j) => j && j.status === "waiting");
  if (!next) return;

  state.running = true;
  try {
    await renderProject(next, next.project);
  } catch (err) {
    if (state.cancelled.has(next.id)) {
      next.status = "cancelled";
      state.cancelled.delete(next.id);
    } else {
      next.status = "failed";
      next.error = err instanceof Error ? err.message : String(err);
    }
    next.finishedAt = Date.now();
  } finally {
    state.running = false;
    // Continue with any remaining waiting jobs.
    void runNext();
  }
}

export function getJob(id: string): RenderJob | undefined {
  return state.jobs.get(id);
}

export function listPublic(): RenderJobPublic[] {
  const now = Date.now();
  return state.order
    .map((id) => state.jobs.get(id))
    .filter((j): j is RenderJob => Boolean(j))
    .map((j) => toPublic(j, now));
}

export function cancel(id: string): boolean {
  const job = state.jobs.get(id);
  if (!job) return false;
  if (job.status === "waiting") {
    job.status = "cancelled";
    job.finishedAt = Date.now();
    return true;
  }
  if (job.status === "preparing" || job.status === "rendering" || job.status === "encoding") {
    state.cancelled.add(id);
    job.cancel?.();
    return true;
  }
  return false;
}

/** Retry a failed/cancelled job by resetting it and re-queueing. */
export function retry(id: string): boolean {
  const job = state.jobs.get(id);
  if (!job || (job.status !== "failed" && job.status !== "cancelled")) return false;
  Object.assign(job, {
    status: "waiting",
    progress: 0,
    renderedFrames: 0,
    startedAt: null,
    finishedAt: null,
    error: null,
    outputPath: null,
  });
  void runNext();
  return true;
}

export function remove(id: string): boolean {
  const job = state.jobs.get(id);
  if (!job) return false;
  if (job.status === "rendering" || job.status === "preparing" || job.status === "encoding") cancel(id);
  if (job.outputPath && fs.existsSync(job.outputPath)) {
    try {
      fs.unlinkSync(job.outputPath);
    } catch {
      /* best-effort cleanup */
    }
  }
  state.jobs.delete(id);
  state.order = state.order.filter((o) => o !== id);
  return true;
}
