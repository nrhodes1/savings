"use client";

import { animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export function useAnimatedNumber(target: number, durationSeconds = 0.4): number {
  const [value, setValue] = useState(target);
  const prevTarget = useRef(target);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const controls = animate(prevTarget.current, target, {
      duration: reducedMotion ? 0 : durationSeconds,
      ease: "easeOut",
      onUpdate: setValue,
    });
    prevTarget.current = target;
    return () => controls.stop();
  }, [target, durationSeconds, reducedMotion]);

  return value;
}
