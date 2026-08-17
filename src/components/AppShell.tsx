"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function AppShell({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  // La liste des sourates a besoin de place pour 3 cartes par ligne en
  // desktop (3 * w-80 + gaps ≈ 984px) — plus large que le max-w-225 (900px)
  // par défaut du reste de l'app. Scopé à la page exacte /sourates, pas
  // à /sourates/[id]. Le header garde toujours max-w-225 : il doit rester
  // identique sur toutes les pages, seul le contenu s'élargit.
  const isSouratesList = pathname === "/sourates";

  return (
    <div className="flex min-h-screen flex-col font-sans text-sm">
      <div className="mx-auto w-full max-w-225">{header}</div>
      <div
        className={`mx-auto flex w-full flex-1 flex-col ${
          isSouratesList ? "max-w-6xl" : "max-w-225"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
