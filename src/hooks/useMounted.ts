"use client";

import { useEffect, useState } from "react";

/**
 * True only after the first client render. Used to gate rendering of
 * localStorage-backed (zustand-persisted) state so server and client markup
 * match on the initial paint.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
