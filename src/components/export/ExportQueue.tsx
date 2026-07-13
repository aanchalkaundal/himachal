"use client";

import React from "react";
import type { RenderJobPublic, RenderStatus } from "@/server/renderTypes";
import { useExportQueue } from "@/lib/export/useExportQueue";
import { Button, Card } from "@/components/ui/primitives";
import { formatDuration } from "@/lib/format";

const STAGE_LABEL: Record<RenderStatus, string> = {
  waiting: "Waiting",
  preparing: "Preparing",
  rendering: "Rendering",
  encoding: "Encoding",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const STAGE_COLOR: Record<RenderStatus, string> = {
  waiting: "bg-slate-600",
  preparing: "bg-amber-500",
  rendering: "bg-sky-500",
  encoding: "bg-violet-500",
  completed: "bg-emerald-500",
  failed: "bg-red-500",
  cancelled: "bg-slate-500",
};

const ACTIVE: RenderStatus[] = ["preparing", "rendering", "encoding"];

/** Full export-queue panel with real progress, stages, timings and downloads. */
export function ExportQueue({ queue }: { queue: ReturnType<typeof useExportQueue> }) {
  const { jobs, error, cancel, retry, removeJob, downloadUrl } = queue;

  if (error)
    return (
      <Card className="p-6 text-sm text-red-400">Render service unreachable: {error}</Card>
    );
  if (jobs.length === 0)
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <div className="text-base font-bold text-slate-300">Export queue is empty</div>
        <div className="mt-1 text-sm text-slate-500">Open a project and click “Export MP4” to render a real video.</div>
      </Card>
    );

  return (
    <div className="space-y-3">
      {jobs.map((j) => (
        <JobRow key={j.id} job={j} onCancel={cancel} onRetry={retry} onRemove={removeJob} downloadUrl={downloadUrl} />
      ))}
    </div>
  );
}

function JobRow({
  job,
  onCancel,
  onRetry,
  onRemove,
  downloadUrl,
}: {
  job: RenderJobPublic;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  downloadUrl: (id: string) => string;
}) {
  const pct = Math.round(job.progress * 100);
  const isActive = ACTIVE.includes(job.status);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="truncate font-bold text-white">{job.projectName}</div>
          <div className="text-xs text-slate-500">
            {job.format.toUpperCase()} · {job.totalFrames > 0 ? `${job.renderedFrames}/${job.totalFrames} frames` : "—"}
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${STAGE_COLOR[job.status]}`}>
          {STAGE_LABEL[job.status]}
        </span>
      </div>

      {/* Real progress bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full transition-all ${STAGE_COLOR[job.status]}`}
          style={{ width: `${job.status === "completed" ? 100 : pct}%` }}
        />
      </div>

      {/* Timings */}
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400">
        <span>{job.status === "completed" ? 100 : pct}%</span>
        <span>Elapsed {formatDuration(job.elapsedMs)}</span>
        {isActive && job.etaMs != null ? <span>ETA {formatDuration(job.etaMs)}</span> : null}
      </div>
      {job.status === "failed" && job.error ? (
        <div className="mt-1 w-full break-all text-xs text-red-400">{job.error}</div>
      ) : null}

      {/* Actions */}
      <div className="mt-3 flex justify-end gap-2">
        {job.status === "completed" && job.hasOutput ? (
          <a href={downloadUrl(job.id)} download>
            <Button>⬇ Download</Button>
          </a>
        ) : null}
        {isActive || job.status === "waiting" ? (
          <Button variant="outline" onClick={() => onCancel(job.id)}>
            Cancel
          </Button>
        ) : null}
        {(job.status === "failed" || job.status === "cancelled") && (
          <Button variant="outline" onClick={() => onRetry(job.id)}>
            Retry
          </Button>
        )}
        {!isActive && (
          <Button variant="ghost" onClick={() => onRemove(job.id)}>
            Remove
          </Button>
        )}
      </div>
    </Card>
  );
}
