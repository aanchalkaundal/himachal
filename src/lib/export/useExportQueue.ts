"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NewsProject } from "@/types/project";
import type { RenderJobPublic } from "@/server/renderTypes";

/**
 * Client hook that owns the export queue UI state by polling the render API.
 * All rendering happens server-side; this only starts jobs and reflects their
 * real progress. Polling runs faster while any job is active, and idles slow
 * when everything is finished.
 */
export function useExportQueue() {
  const [jobs, setJobs] = useState<RenderJobPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/render", { cache: "no-store" });
      const data = await res.json();
      setJobs(data.jobs ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reach render service");
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      await poll();
      const active = document.hidden ? false : true;
      // Poll every 700ms while visible; back off when the tab is hidden.
      timer.current = setTimeout(tick, active ? 700 : 4000);
    };
    tick();
    return () => {
      stopped = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poll]);

  const startRender = useCallback(
    async (project: NewsProject) => {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to start render");
      }
      await poll();
      return (await res.json()).id as string;
    },
    [poll],
  );

  const act = useCallback(
    async (id: string, action: "cancel" | "retry") => {
      await fetch(`/api/render/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await poll();
    },
    [poll],
  );

  const removeJob = useCallback(
    async (id: string) => {
      await fetch(`/api/render/${id}`, { method: "DELETE" });
      await poll();
    },
    [poll],
  );

  const downloadUrl = (id: string) => `/api/render/${id}/download`;

  return { jobs, error, startRender, cancel: (id: string) => act(id, "cancel"), retry: (id: string) => act(id, "retry"), removeJob, downloadUrl };
}
