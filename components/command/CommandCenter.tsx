"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useTwin, type ViewMode } from "@/store/twin";
import { useSim } from "@/store/sim";
import { useSimLoop } from "@/hooks/useSimLoop";
import { TopBar } from "./TopBar";
import { LeftRail } from "./LeftRail";
import { ContextPanel } from "./ContextPanel";
import { BottomDock } from "./BottomDock";
import { ConciergeDock } from "./ConciergeDock";

const TwinCanvas = dynamic(() => import("@/components/twin/TwinCanvas").then((m) => m.TwinCanvas), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-md bg-accent/30 shadow-[0_0_30px_var(--accent)]" />
        <span className="label">Generating resort geometry…</span>
      </div>
    </div>
  ),
});

const keyModes: Record<string, ViewMode> = { "1": "orbit", "2": "exploded", "3": "isolate", "4": "xray", "5": "top", "6": "facade", "7": "site" };

export function CommandCenter() {
  useSimLoop();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "SELECT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      const t = useTwin.getState();
      if (keyModes[e.key]) t.setViewMode(keyModes[e.key]);
      else if (e.key === "Escape") t.select(null);
      else if (e.key === " ") {
        e.preventDefault();
        const s = useSim.getState();
        s.setPaused(!s.state.paused);
      } else if (e.key === "[" || e.key === "]") {
        const f = t.isolatedFloor ?? 3;
        t.setIsolatedFloor(Math.max(1, Math.min(7, f + (e.key === "]" ? 1 : -1))));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-void">
      <div className="absolute inset-0">
        <TwinCanvas />
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col gap-3 p-3">
        <TopBar />
        <div className="flex min-h-0 flex-1 items-start justify-between gap-3">
          <LeftRail />
          <div className="flex h-full flex-1 flex-col items-end justify-end">
            <ConciergeDock />
          </div>
          <ContextPanel />
        </div>
        <BottomDock />
      </div>
    </div>
  );
}
