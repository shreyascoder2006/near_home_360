"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

export function DebugBridge() {
  const store = useThree((s) => s.get);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __r3f: unknown }).__r3f = store;
  }, [store]);
  return null;
}
