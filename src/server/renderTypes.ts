import type { NewsProject, VideoFormat } from "@/types/project";

/** Lifecycle states required by the spec. */
export type RenderStatus =
  | "waiting"
  | "preparing"
  | "rendering"
  | "encoding"
  | "completed"
  | "failed"
  | "cancelled";

/** Server-side render job. The heavy `project` is kept for retry; the client
 * receives a serialized view without it (see `toPublic`). */
export interface RenderJob {
  id: string;
  projectId: string;
  projectName: string;
  format: VideoFormat;
  status: RenderStatus;
  /** 0..1 overall progress. */
  progress: number;
  renderedFrames: number;
  totalFrames: number;
  startedAt: number | null;
  finishedAt: number | null;
  createdAt: number;
  error: string | null;
  /** Absolute path to the finished file (server-only). */
  outputPath: string | null;
  /** Cancel handle (server-only). */
  cancel?: () => void;
  /** Retained for retry (server-only). */
  project: NewsProject;
}

/** Client-facing job view with derived timings, minus server-only fields. */
export interface RenderJobPublic {
  id: string;
  projectId: string;
  projectName: string;
  format: VideoFormat;
  status: RenderStatus;
  progress: number;
  renderedFrames: number;
  totalFrames: number;
  elapsedMs: number;
  etaMs: number | null;
  error: string | null;
  hasOutput: boolean;
}

export function toPublic(job: RenderJob, now: number): RenderJobPublic {
  const elapsedMs = job.startedAt ? (job.finishedAt ?? now) - job.startedAt : 0;
  const etaMs =
    job.status === "rendering" || job.status === "encoding"
      ? job.progress > 0.01
        ? Math.max(0, (elapsedMs / job.progress) * (1 - job.progress))
        : null
      : job.status === "completed"
        ? 0
        : null;
  return {
    id: job.id,
    projectId: job.projectId,
    projectName: job.projectName,
    format: job.format,
    status: job.status,
    progress: job.progress,
    renderedFrames: job.renderedFrames,
    totalFrames: job.totalFrames,
    elapsedMs,
    etaMs,
    error: job.error,
    hasOutput: Boolean(job.outputPath),
  };
}
