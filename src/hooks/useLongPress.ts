import { useCallback, useRef, useState } from "react";

export function useLongPress(callback: () => void, duration = 600) {
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  const cleanup = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }, []);

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    setPressing(true);
    setProgress(0);
    startRef.current = performance.now();

    const tick = (now: number) => {
      if (!activeRef.current) return;
      const elapsed = now - (startRef.current ?? now);
      const p = Math.min(100, (elapsed / duration) * 100);
      setProgress(p);
      if (p < 100) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    timerRef.current = setTimeout(() => {
      cleanup();
      setPressing(false);
      setProgress(0);
      callback();
    }, duration);
  }, [callback, cleanup, duration]);

  const cancel = useCallback(() => {
    if (!activeRef.current) return;
    cleanup();
    setPressing(false);
    setProgress(0);
  }, [cleanup]);

  return {
    handlers: {
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); start(); },
      onTouchEnd: cancel,
      onTouchCancel: cancel,
    },
    pressing,
    progress,
  };
}
