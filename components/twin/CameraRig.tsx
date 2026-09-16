"use client";

import { useEffect, useRef } from "react";
import { CameraControls } from "@react-three/drei";
import type CameraControlsImpl from "camera-controls";
import { useThree } from "@react-three/fiber";
import { useTwin, type ViewMode } from "@/store/twin";
import { getModel } from "@/lib/architecture/model";
import { defaultConfig } from "@/lib/architecture/config";
import { floorY } from "@/lib/architecture/generate";
import { EXPLODE_GAP } from "./FloorGroup";

export const cameraRef: { current: CameraControlsImpl | null } = { current: null };

type Look = [number, number, number, number, number, number];

export function presetFor(mode: ViewMode, isolatedFloor: number | null): Look {
  const m = getModel();
  const H = m.dims.height;
  const L = m.dims.length;
  switch (mode) {
    case "orbit":
      return [L * 1.1, H * 1.6, -L * 1.25, 0, H * 0.42, -6];
    case "exploded": {
      const top = H + m.floors.length * EXPLODE_GAP;
      return [L * 1.7, top * 0.85, -L * 1.7, 0, top * 0.48, 0];
    }
    case "isolate": {
      const f = isolatedFloor ?? 3;
      const y = floorY(defaultConfig, f);
      return [L * 0.55, y + 34, -L * 0.75, 0, y + 1, 0];
    }
    case "xray":
      return [L * 0.9, H * 0.9, -L * 0.95, 0, H * 0.45, 0];
    case "top":
      return [0, H + 125, -6.05, 0, H * 0.3, -6];
    case "facade":
      return [8, H * 0.55, -L * 1.6, 0, H * 0.5, 0];
    case "site":
      return [L * 2.2, H * 2.6, -L * 2.4, 0, 0, -30];
    case "room":
      return [L * 0.55, H * 0.7, -L * 0.75, 0, H * 0.4, 0];
  }
}

export function CameraRig() {
  const ref = useRef<CameraControlsImpl>(null!);
  const { invalidate } = useThree();

  useEffect(() => {
    cameraRef.current = ref.current;
    const c = ref.current;
    c.minDistance = 6;
    c.maxDistance = 420;
    c.maxPolarAngle = Math.PI * 0.495;
    c.smoothTime = 0.55;
    c.draggingSmoothTime = 0.12;
    c.dollyToCursor = true;
    c.infinityDolly = false;
    const [x, y, z, tx, ty, tz] = presetFor("orbit", null);
    c.setLookAt(x, y, z, tx, ty, tz, false);
    return () => {
      cameraRef.current = null;
    };
  }, []);

  useEffect(() => {
    const unsub = useTwin.subscribe(
      (s) => [s.viewMode, s.isolatedFloor] as const,
      ([mode, floor]) => {
        const c = ref.current;
        if (!c) return;
        if (mode === "room") return;
        const [x, y, z, tx, ty, tz] = presetFor(mode, floor);
        c.setLookAt(x, y, z, tx, ty, tz, true);
        invalidate();
      },
      { equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] },
    );
    return unsub;
  }, [invalidate]);

  useEffect(() => {
    const unsub = useTwin.subscribe(
      (s) => s.selected,
      (sel) => {
        const c = ref.current;
        if (!c || !sel) return;
        const m = getModel();
        const { viewMode, isolatedFloor } = useTwin.getState();
        const yOff = (f: number) => (viewMode === "exploded" ? f * EXPLODE_GAP : 0);
        if (sel.kind === "room") {
          const r = m.roomById.get(sel.id);
          if (!r) return;
          const y = r.center[1] + yOff(r.floor);
          if (viewMode === "room") {
            const inside = r.facing;
            c.setLookAt(r.center[0] + 1.2, y + 1.7, r.center[2] - inside * (r.d / 2 - 0.8), r.center[0], y + 1.2, r.center[2] + inside * r.d, true);
          } else if (viewMode === "isolate" && isolatedFloor === r.floor) {
            c.setLookAt(r.center[0] + 10, y + 16, r.center[2] - r.facing * 14, r.center[0], y + 1, r.center[2], true);
          } else {
            c.setLookAt(r.center[0] + 22 * r.facing * -1 + 10, y + 12, r.center[2] + r.facing * 30, r.center[0], y + 1, r.center[2], true);
          }
        } else if (sel.kind === "asset") {
          const a = m.assetById.get(sel.id);
          if (!a) return;
          const y = a.position[1] + yOff(a.floor);
          const roof = a.floor >= m.floors.length;
          const dx = a.position[0] < 0 ? -1 : 1;
          c.setLookAt(a.position[0] + dx * (roof ? 22 : 12), y + (roof ? 16 : 9), a.position[2] - (roof ? 26 : 14), a.position[0], y, a.position[2], true);
        } else if (sel.kind === "zone") {
          const z = m.zoneById.get(sel.id);
          if (!z) return;
          const y = z.center[1] + yOff(z.floor);
          c.setLookAt(z.center[0] + 18, y + 22, z.center[2] - 24, z.center[0], y + 1, z.center[2], true);
        }
        invalidate();
      },
    );
    return unsub;
  }, [invalidate]);

  return <CameraControls ref={ref} makeDefault />;
}
