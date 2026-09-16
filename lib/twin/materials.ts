import * as THREE from "three";

export type MatRole = "wall" | "slab" | "glass" | "mullion" | "furniture" | "plate" | "core" | "site";

export function tag<T extends THREE.Material>(m: T, role: MatRole): T {
  m.userData.role = role;
  m.userData.baseOpacity = m.opacity;
  return m;
}

export const makeWall = () =>
  tag(new THREE.MeshStandardMaterial({ color: "#c9d1dc", roughness: 0.85, metalness: 0.02, transparent: false }), "wall");

export const makeSlab = () =>
  tag(new THREE.MeshStandardMaterial({ color: "#3a4452", roughness: 0.7, metalness: 0.1 }), "slab");

export const makeCore = () =>
  tag(new THREE.MeshStandardMaterial({ color: "#1c2532", roughness: 0.6, metalness: 0.2 }), "core");

export const makeGlass = (transmission: boolean) =>
  tag(
    transmission
      ? new THREE.MeshPhysicalMaterial({
          color: "#9fd6e8",
          roughness: 0.08,
          metalness: 0,
          transmission: 0.85,
          thickness: 0.4,
          ior: 1.45,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          envMapIntensity: 1.4,
        })
      : new THREE.MeshPhysicalMaterial({
          color: "#7fc4dc",
          roughness: 0.1,
          metalness: 0.15,
          transparent: true,
          opacity: 0.32,
          side: THREE.DoubleSide,
          envMapIntensity: 1.6,
          clearcoat: 0.6,
        }),
    "glass",
  );

export const makeMullion = () =>
  tag(new THREE.MeshStandardMaterial({ color: "#0f141b", roughness: 0.4, metalness: 0.8 }), "mullion");

export const makeFurniture = (color: string) =>
  tag(new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 }), "furniture");

export const makePlate = () =>
  tag(
    new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9, toneMapped: false }),
    "plate",
  );
