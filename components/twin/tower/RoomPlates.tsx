"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { FloorSpec } from "@/lib/architecture/types";
import { makePlate } from "@/lib/twin/materials";
import { roomColor } from "@/lib/twin/colors";
import { useRegisterMaterial } from "../FloorGroup";
import { useTwin } from "@/store/twin";
import { useSim } from "@/store/sim";

const tmpColor = new THREE.Color();
const tmpM = new THREE.Matrix4();

export function RoomPlates({ floor }: { floor: FloorSpec }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const mat = useMemo(() => makePlate(), []);
  useRegisterMaterial(mat);
  const rooms = floor.rooms;
  const geo = useMemo(() => new THREE.BoxGeometry(1, 0.06, 1), []);

  useEffect(() => {
    const m = ref.current;
    rooms.forEach((r, i) => {
      tmpM.makeScale(r.w - 0.32, 1, r.d - 0.32);
      tmpM.setPosition(r.center[0], 0.04, r.center[2]);
      m.setMatrixAt(i, tmpM);
      m.setColorAt(i, tmpColor.set("#22364a"));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [rooms]);

  const lastVersion = useRef(-1);
  const lastLayer = useRef("");
  const lastSel = useRef<string | null>(null);
  const lastHov = useRef<string | null>(null);
  const pulse = useRef(0);

  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const { activeLayer, selected, hovered } = useTwin.getState();
    const { version, state } = useSim.getState();
    pulse.current += dt;
    const selId = selected?.kind === "room" ? selected.id : null;
    const hovId = hovered?.kind === "room" ? hovered.id : null;
    const needs = version !== lastVersion.current || activeLayer !== lastLayer.current || selId !== lastSel.current || hovId !== lastHov.current || selId !== null;
    if (!needs) return;
    lastVersion.current = version;
    lastLayer.current = activeLayer;
    lastSel.current = selId;
    lastHov.current = hovId;
    rooms.forEach((r, i) => {
      const st = state.rooms[r.id];
      roomColor(activeLayer, r, st, tmpColor);
      if (r.id === hovId) tmpColor.lerp(new THREE.Color("#ffffff"), 0.35);
      if (r.id === selId) {
        const p = 0.55 + 0.45 * Math.sin(pulse.current * 5);
        tmpColor.lerp(new THREE.Color("#ffffff"), 0.25 + 0.35 * p);
      }
      m.setColorAt(i, tmpColor);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const i = e.instanceId;
    if (i === undefined) return;
    const { viewMode, isolatedFloor } = useTwin.getState();
    if ((viewMode === "isolate" || viewMode === "room") && isolatedFloor !== null && isolatedFloor !== floor.index) return;
    useTwin.getState().select({ kind: "room", id: rooms[i].id });
  };
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const i = e.instanceId;
    if (i === undefined) return;
    useTwin.getState().hover({ kind: "room", id: rooms[i].id });
    document.body.style.cursor = "pointer";
  };
  const onOut = () => {
    useTwin.getState().hover(null);
    document.body.style.cursor = "auto";
  };

  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, rooms.length]}
      onClick={onClick}
      onPointerOver={onOver}
      onPointerOut={onOut}
      frustumCulled={false}
    />
  );
}
