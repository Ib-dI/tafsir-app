import axios from 'axios';

export async function getSimpleChapters() {
  const url = 'https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/chapters/fr/index.json';
  const response = await axios.get(url);
  return response.data;
}

export async function getSimpleChapterVerses(id: string | number) {
  const url = `https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/chapters/fr/${id}.json`;
  const response = await axios.get(url);
  return response.data;
} 