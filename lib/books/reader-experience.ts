import type { Book } from "./client-library";
import { storyTagsForBook } from "./story-tags";

export type SeriesInfo = { name: string; number?: number };

export function seriesInfo(title: string): SeriesInfo | null {
  const match = title.match(/\(([^()]+)\)\s*$/);
  if (!match) return null;
  const metadata = match[1].trim();
  const numbered = metadata.match(/^(.+?)(?:,|\s)\s*#(\d+(?:\.\d+)?)\s*$/);
  if (numbered) return { name: numbered[1].trim(), number: Number(numbered[2]) };
  if (/\b(?:series|duet|trilogy|saga)\b/i.test(metadata)) return { name: metadata };
  return null;
}

export function seriesInfoForBook(book: Book): SeriesInfo | null {
  if (book.seriesExcluded) return null;
  if (book.seriesName?.trim()) return { name: book.seriesName.trim(), number: book.seriesNumber };
  return seriesInfo(book.title);
}

export function relatedShelfBooks(selected: Book, books: Book[], limit = 4) {
  const selectedTags = storyTagsForBook(selected);
  const wanted = new Set([...selectedTags.tropes, ...selectedTags.genres, ...selectedTags.moods].map((tag) => tag.toLowerCase()));
  return books
    .filter((book) => book.id !== selected.id)
    .map((book) => {
      const tags = storyTagsForBook(book);
      const overlap = [...tags.tropes, ...tags.genres, ...tags.moods].filter((tag) => wanted.has(tag.toLowerCase())).length;
      const sameAuthor = book.author.trim().toLowerCase() === selected.author.trim().toLowerCase() ? 3 : 0;
      return { book, score: overlap + sameAuthor };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title))
    .slice(0, limit)
    .map(({ book }) => book);
}
