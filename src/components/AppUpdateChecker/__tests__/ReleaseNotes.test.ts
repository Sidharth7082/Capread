import { parseReleaseNotes } from '../ReleaseNotes';

jest.mock('@i18n/translations', () => ({
  getString: (key: string) => key,
}));

describe('parseReleaseNotes', () => {
  it('returns no blocks for empty notes', () => {
    expect(parseReleaseNotes('')).toEqual([]);
  });

  it('parses headings, bullets and paragraphs', () => {
    expect(
      parseReleaseNotes('## Features\n- One\n- Two\nPlain text'),
    ).toEqual([
      { type: 'heading', text: 'Features' },
      { type: 'bullet', text: 'One' },
      { type: 'bullet', text: 'Two' },
      { type: 'paragraph', text: 'Plain text' },
    ]);
  });

  it('folds GitHub note admonitions into a single note block', () => {
    expect(
      parseReleaseNotes('> [!NOTE]\n> First line\n> Second line'),
    ).toEqual([{ type: 'note', text: 'First line Second line' }]);
  });

  it('strips inline markdown syntax', () => {
    expect(
      parseReleaseNotes('**Bold** and `code` and [link](https://example.com)'),
    ).toEqual([{ type: 'paragraph', text: 'Bold and code and link' }]);
  });

  it('supports the dot bullets used in older notes', () => {
    expect(parseReleaseNotes('· Dot item')).toEqual([
      { type: 'bullet', text: 'Dot item' },
    ]);
  });
});
