"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useProfile } from "@/store/quality";

export function Lighting() {
  const p = useProfile();
  return (
    <>
      <hemisphereLight args={["#2a4a6a", "#0a0f14", 0.55]} />
      <directionalLight
        position={[-60, 90, -40]}
        intensity={1.6}
        color="#dfe9ff"
        castShadow={p.shadows}
        shadow-mapSize={[p.shadowMap, p.shadowMap]}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-camera-near={10}
        shadow-camera-far={300}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[70, 40, 60]} intensity={0.35} color="#2dd4bf" />
      <pointLight position={[0, 8, -55]} intensity={40} color="#0fb7d6" distance={60} decay={2} />
      <Environment resolution={256} frames={1} environmentIntensity={0.9}>
        <color attach="background" args={["#070b12"]} />
        <Lightformer form="rect" intensity={3} color="#cfe3ff" position={[0, 40, -60]} scale={[80, 20, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#2dd4bf" position={[60, 10, 30]} scale={[30, 12, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.8} color="#f5a524" position={[-60, 6, 30]} scale={[20, 8, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={1.5} color="#8fb8ff" position={[0, 80, 0]} scale={[40, 40, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={0.5} color="#04365a" position={[0, -20, 0]} scale={[200, 200, 1]} rotation-x={-Math.PI / 2} />
      </Environment>
      <fog attach="fog" args={["#05070a", 160, 420]} />
    </>
  );
}
