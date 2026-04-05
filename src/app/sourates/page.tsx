import { getSimpleChapters } from "@/lib/quranSimpleApi";
import { Suspense } from "react";
import SouratesClient from "./SouratesClient";

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function SouratesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const initialShowAudio = firstParam(sp.showAudio) !== "all";
  const initialShowFavorites = firstParam(sp.showFavorites) === "true";

  let chapters: Awaited<ReturnType<typeof getSimpleChapters>> = [];
  let chaptersLoadError = false;
  try {
    chapters = await getSimpleChapters();
  } catch {
    chaptersLoadError = true;
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-gray-500">
          Chargement…
        </div>
      }
    >
      <SouratesClient
        initialChapters={chapters}
        chaptersLoadError={chaptersLoadError}
        initialShowAudio={initialShowAudio}
        initialShowFavorites={initialShowFavorites}
      />
    </Suspense>
  );
}
