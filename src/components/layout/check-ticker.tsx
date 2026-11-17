"use client";

import { useEffect } from "react";

/** While the dashboard is open, asks the server to run due checks once a minute. */
export function CheckTicker() {
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") fetch("/api/cron/checks", { cache: "no-store" }).catch(() => {});
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return null;
}
