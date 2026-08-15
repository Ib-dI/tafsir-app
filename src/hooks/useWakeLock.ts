import { useEffect, useRef } from "react";

export function useWakeLock(isActive: boolean): void {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      if ("wakeLock" in navigator && navigator.wakeLock) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          wakeLockRef.current.addEventListener("release", () => {
            wakeLockRef.current = null;
          });
        } catch (err) {
          if (err instanceof Error) {
            console.error(`Erreur Wake Lock: ${err.name}, ${err.message}`);
          } else {
            console.error("Erreur Wake Lock inconnue", err);
          }
          wakeLockRef.current = null;
        }
      } else {
        console.warn("API Wake Lock non supportée par ce navigateur.");
      }
    };

    const releaseWakeLock = () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };

    if (isActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [isActive]);
}
