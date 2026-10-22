import type { NovelInfo } from '@database/types';

/** Splits the comma-separated genres column into lowercase, trimmed tags. */
export const parseGenres = (genres?: string | null): string[] =>
  (genres ?? '')
    .split(',')
    .map(genre => genre.trim().toLowerCase())
    .filter(Boolean);

export interface LibraryFilterCriteria {
  /** Lowercase search text from the library searchbar. */
  searchLower?: string;
  /** Selected genres; a novel must have every one of them. */
  genres?: string[];
}

/**
 * Matches a novel against the library search text and the genre filter.
 * Search covers the title, the author and the genres, so typing a tag works.
 */
export const matchesLibraryFilters = (
  novel: NovelInfo,
  { searchLower = '', genres = [] }: LibraryFilterCriteria = {},
): boolean => {
  const novelGenres = parseGenres(novel.genres);

  if (
    genres.length > 0 &&
    !genres.every(genre => novelGenres.includes(genre.toLowerCase()))
  ) {
    return false;
  }

  if (!searchLower) {
    return true;
  }

  return (
    novel.name.toLowerCase().includes(searchLower) ||
    (novel.author?.toLowerCase().includes(searchLower) ?? false) ||
    novelGenres.some(genre => genre.includes(searchLower))
  );
};
