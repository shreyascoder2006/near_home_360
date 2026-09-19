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
import { getModel } from "@/lib/architecture/model";
import { skyRuntime } from "@/lib/twin/sky";

const tmpColor = new THREE.Color();
const white = new THREE.Color("#ffffff");
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();

export function RoomPlates({ floor }: { floor: FloorSpec }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const glow = useRef<THREE.InstancedMesh>(null!);
  const mat = useMemo(() => makePlate(), []);
  const glowMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false, side: THREE.DoubleSide });
    m.userData.role = "plate";
    m.userData.baseOpacity = 1;
    return m;
  }, []);
  useRegisterMaterial([mat, glowMat]);
  const rooms = floor.rooms;
  const geo = useMemo(() => new THREE.BoxGeometry(1, 0.06, 1), []);
  const glowGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const D = getModel().dims.depth / 2;

  useEffect(() => {
    const m = ref.current;
    const g = glow.current;
    rooms.forEach((r, i) => {
      tmpM.makeScale(r.w - 0.32, 1, r.d - 0.32);
      tmpM.setPosition(r.center[0], 0.04, r.center[2]);
      m.setMatrixAt(i, tmpM);
      m.setColorAt(i, tmpColor.set("#22364a"));
      tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r.facing === 1 ? 0 : Math.PI);
      tmpP.set(r.center[0], r.h * 0.5, r.facing * (D + 0.12));
      tmpS.set(r.w - 0.7, r.h - 1.1, 1);
      g.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS));
      g.setColorAt(i, tmpColor);
    });
    m.instanceMatrix.needsUpdate = true;
    g.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    if (g.instanceColor) g.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    g.computeBoundingSphere();
  }, [rooms, D]);

  const lastVersion = useRef(-1);
  const lastLayer = useRef("");
  const lastSel = useRef<string | null>(null);
  const lastHov = useRef<string | null>(null);
  const pulse = useRef(0);

  useFrame((_, dt) => {
    const m = ref.current;
    const g = glow.current;
    if (!m || !g) return;
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
      if (r.id === hovId) tmpColor.lerp(white, 0.35);
      if (r.id === selId) tmpColor.lerp(white, 0.25 + 0.35 * (0.55 + 0.45 * Math.sin(pulse.current * 5)));
      m.setColorAt(i, tmpColor);
      const lit = activeLayer === "occupancy" ? (st.guestId ? 0.75 : st.status === "vacant-dirty" ? 0.6 : 0.3) : 0.7;
      const nf = 0.22 + 0.85 * skyRuntime.nightFactor;
      g.setColorAt(i, tmpColor.multiplyScalar(lit * nf));
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    if (g.instanceColor) g.instanceColor.needsUpdate = true;
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
    <>
      <instancedMesh ref={ref} args={[geo, mat, rooms.length]} onClick={onClick} onPointerOver={onOver} onPointerOut={onOut} frustumCulled={false} />
      <instancedMesh ref={glow} args={[glowGeo, glowMat, rooms.length]} onClick={onClick} onPointerOver={onOver} onPointerOut={onOut} frustumCulled={false} />
    </>
  );
}
