import { parseChapterNumber } from '../parseChapterNumber';

describe('parseChapterNumber', () => {
  it('returns the provided chapterNumber when valid', () => {
    expect(parseChapterNumber('Novel', 'Chapter 5', 5)).toBe(5);
  });

  it('parses a basic chapter number from the name', () => {
    expect(parseChapterNumber('Novel', 'Chapter 12')).toBe(12);
  });

  it('does not throw when chapterName is undefined', () => {
    expect(parseChapterNumber('Novel', undefined as unknown as string)).toBe(
      -1,
    );
  });

  it('does not throw when chapterName is null', () => {
    expect(parseChapterNumber('Novel', null as unknown as string)).toBe(-1);
  });

  it('falls back to the given chapterNumber when chapterName is missing', () => {
    expect(
      parseChapterNumber('Novel', undefined as unknown as string, -1),
    ).toBe(-1);
  });

  it('does not throw when novelName is undefined', () => {
    expect(
      parseChapterNumber(undefined as unknown as string, 'Chapter 3'),
    ).toBe(3);
  });
});
