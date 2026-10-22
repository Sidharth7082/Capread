import type { NovelInfo } from '@database/types';
import { matchesLibraryFilters, parseGenres } from '../libraryFilters';

const novel = (overrides: Partial<NovelInfo> = {}): NovelInfo =>
  ({
    id: 1,
    name: 'The Wandering Ring',
    author: 'Kindhearted Bee',
    genres: 'Action, Adventure, Comedy',
    inLibrary: true,
    ...overrides,
  } as NovelInfo);

describe('parseGenres', () => {
  it('splits, trims and lowercases genres', () => {
    expect(parseGenres(' Action , Adventure ')).toEqual([
      'action',
      'adventure',
    ]);
  });

  it('handles empty values', () => {
    expect(parseGenres(undefined)).toEqual([]);
    expect(parseGenres('')).toEqual([]);
  });
});

describe('matchesLibraryFilters', () => {
  it('matches everything when no criteria are given', () => {
    expect(matchesLibraryFilters(novel())).toBe(true);
  });

  it('requires every selected genre to be present', () => {
    expect(
      matchesLibraryFilters(novel(), { genres: ['action', 'adventure'] }),
    ).toBe(true);
    expect(
      matchesLibraryFilters(novel(), { genres: ['action', 'romance'] }),
    ).toBe(false);
  });

  it('searches titles and authors case-insensitively', () => {
    expect(matchesLibraryFilters(novel(), { searchLower: 'wandering' })).toBe(
      true,
    );
    expect(matchesLibraryFilters(novel(), { searchLower: 'kindhearted' })).toBe(
      true,
    );
  });

  it('searches genres by tag', () => {
    expect(matchesLibraryFilters(novel(), { searchLower: 'comedy' })).toBe(
      true,
    );
    expect(matchesLibraryFilters(novel(), { searchLower: 'romance' })).toBe(
      false,
    );
  });

  it('applies search and genre criteria together', () => {
    expect(
      matchesLibraryFilters(novel(), {
        searchLower: 'ring',
        genres: ['comedy'],
      }),
    ).toBe(true);
    expect(
      matchesLibraryFilters(novel(), {
        searchLower: 'ring',
        genres: ['romance'],
      }),
    ).toBe(false);
  });
});
