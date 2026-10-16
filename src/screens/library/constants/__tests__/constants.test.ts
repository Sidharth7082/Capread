import { getLibraryCategoryIndex } from '../constants';

const categories = [{ id: 1 }, { id: 7 }, { id: 12 }];

describe('getLibraryCategoryIndex', () => {
  it('returns the index of the saved category', () => {
    expect(getLibraryCategoryIndex(categories, 7)).toBe(1);
  });

  it('falls back to the first category when the saved category is unavailable', () => {
    expect(getLibraryCategoryIndex(categories, 99)).toBe(0);
  });

  it('finds the saved category after categories are reordered', () => {
    expect(getLibraryCategoryIndex([{ id: 7 }, { id: 1 }, { id: 12 }], 7)).toBe(
      0,
    );
  });
});
