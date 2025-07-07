// types/quranApi.ts

export interface TranslatedName {
  language_name: string;
  name: string;
}

export interface Chapter {
  id: number;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  pages: [number, number];
  translated_name: TranslatedName;
}

export interface ChaptersResponse {
  chapters: Chapter[];
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface VerseTranslation {
  resource_id: number;
  text: string;
}

export interface Verse {
  id: number;
  chapter_id: number;
  verse_number: number;
  page_number: number;
  juz_number: number;
  hizb_number: number;
  rub_el_hizb_number: number;
  text_uthmani: string;
  translations: VerseTranslation[];
  text_indopak?: string; // Array of translations based on 'translations' param
  // D'autres champs peuvent être présents selon l'API, ajoutez-les si nécessaire
}

export interface VersesByChapterResponse {
  verses: Verse[];
  pagination: {
    total_records: number;
    current_page: number;
    per_page: number;
    total_pages: number;
    next_page: number | null;
    prev_page: number | null;
  };
}