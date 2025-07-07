// app/api/quran/chapters/route.ts
import { getChapters } from '../../../../lib/quranApi';
import { NextResponse } from 'next/server';
import type { ChaptersResponse } from '../../../../types/quranApi'; // Importez le type de réponse attendu

export async function GET(request: Request) { // Spécifiez le type de 'request'
  try {
    const chaptersResponse: ChaptersResponse | null = await getChapters();
    if (chaptersResponse) {
      return NextResponse.json(chaptersResponse);
    } else {
      return NextResponse.json({ error: 'Failed to fetch chapters from API.' }, { status: 500 });
    }
  } catch (error: any) {
    console.error("API Route error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}