import { getSimpleChapters } from "@/lib/quranSimpleApi";
import { SITE_URL } from "@/lib/site";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const chapters = await getSimpleChapters();

  const chapterEntries: MetadataRoute.Sitemap = chapters.map((chapter) => ({
    url: `${SITE_URL}/sourates/${chapter.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/sourates`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...chapterEntries,
  ];
}
