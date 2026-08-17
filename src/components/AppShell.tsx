"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // La liste des sourates a besoin de place pour 3 cartes par ligne en
  // desktop (3 * w-80 + gaps ≈ 984px) — plus large que le max-w-225 (900px)
  // par défaut du reste de l'app. Scopé à la page exacte /sourates, pas
  // à /sourates/[id].
  const isSouratesList = pathname === "/sourates";

  return (
    <div
      className={`mx-auto flex min-h-screen flex-col font-sans text-sm ${
        isSouratesList ? "max-w-6xl" : "max-w-225"
      }`}
    >
      {children}
    </div>
  );
}
