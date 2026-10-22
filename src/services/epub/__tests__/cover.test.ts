import { resolveEpubCoverPath } from '../cover';

describe('resolveEpubCoverPath', () => {
  it('strips the cache-busting query from local cover URIs', () => {
    expect(
      resolveEpubCoverPath(
        'file:///data/user/0/com.app/files/novels/plugin/1/cover.png?1712345678',
      ),
    ).toBe('file:///data/user/0/com.app/files/novels/plugin/1/cover.png');
  });

  it('strips fragments as well', () => {
    expect(resolveEpubCoverPath('file:///novels/plugin/1/cover.jpg#frag')).toBe(
      'file:///novels/plugin/1/cover.jpg',
    );
  });

  it('keeps plain absolute paths untouched', () => {
    expect(resolveEpubCoverPath('/data/novels/plugin/1/cover.png')).toBe(
      '/data/novels/plugin/1/cover.png',
    );
  });

  it('drops remote URLs that the exporter cannot read', () => {
    expect(resolveEpubCoverPath('https://example.com/cover.png')).toBe('');
  });

  it('handles empty input', () => {
    expect(resolveEpubCoverPath(undefined)).toBe('');
    expect(resolveEpubCoverPath(null)).toBe('');
    expect(resolveEpubCoverPath('   ')).toBe('');
  });
});
