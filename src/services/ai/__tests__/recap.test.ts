import {
  buildNotesPrompt,
  buildRecapPrompt,
  chunkRecapChapters,
  htmlToPlainText,
  normalizeWhitespace,
  truncateText,
} from '../recap';

const chapter = (id: number, text: string) => ({
  id,
  name: `Chapter ${id}`,
  text,
});

describe('htmlToPlainText', () => {
  it('strips scripts and styles and keeps readable text', () => {
    const html = `
      <html>
        <head>
          <style>p { color: red; }</style>
          <script>alert('xss')</script>
        </head>
        <body>
          <h1>Chapter 1</h1>
          <p>Hello    world</p>
          <div>Second &amp; third</div>
        </body>
      </html>
    `;

    const text = htmlToPlainText(html);

    expect(text).not.toContain('alert');
    expect(text).not.toContain('color: red');
    expect(text).toContain('Chapter 1');
    expect(text).toContain('Hello world');
    expect(text).toContain('Second & third');
  });

  it('converts <br> into newlines', () => {
    expect(htmlToPlainText('<p>a<br>b</p>')).toBe('a\nb');
  });

  it('collapses runs of blank lines', () => {
    expect(normalizeWhitespace('a\n\n\n\n\nb')).toBe('a\n\nb');
  });
});

describe('truncateText', () => {
  it('leaves short text untouched', () => {
    expect(truncateText('short', 10)).toBe('short');
  });

  it('truncates long text with an ellipsis', () => {
    expect(truncateText('abcdefghij', 4)).toBe('abcd…');
  });
});

describe('chunkRecapChapters', () => {
  it('keeps only the most recent chapters', () => {
    const chapters = Array.from({ length: 10 }, (_, index) =>
      chapter(index + 1, 'x'.repeat(10)),
    );

    const batches = chunkRecapChapters(chapters, {
      maxChapters: 3,
      perChapterCap: 100,
      batchCharBudget: 1000,
    });

    expect(batches.flat().map(item => item.id)).toEqual([8, 9, 10]);
  });

  it('truncates chapters to the per-chapter cap', () => {
    const batches = chunkRecapChapters([chapter(1, 'a'.repeat(50))], {
      maxChapters: 5,
      perChapterCap: 10,
      batchCharBudget: 1000,
    });

    expect(batches[0][0].text).toBe(`${'a'.repeat(10)}…`);
  });

  it('splits chapters by the batch character budget', () => {
    const chapters = [
      chapter(1, 'a'.repeat(40)),
      chapter(2, 'b'.repeat(40)),
      chapter(3, 'c'.repeat(40)),
    ];

    const batches = chunkRecapChapters(chapters, {
      maxChapters: 10,
      perChapterCap: 40,
      batchCharBudget: 100,
    });

    expect(batches.map(batch => batch.map(item => item.id))).toEqual([
      [1, 2],
      [3],
    ]);
  });

  it('drops chapters without text', () => {
    const batches = chunkRecapChapters(
      [chapter(1, '   '), chapter(2, 'real text')],
      { maxChapters: 5, perChapterCap: 100, batchCharBudget: 1000 },
    );

    expect(batches.flat().map(item => item.id)).toEqual([2]);
  });
});

describe('prompt builders', () => {
  it('includes the novel name and chapter content in the notes prompt', () => {
    const prompt = buildNotesPrompt('My Novel', [chapter(1, 'Body text')]);

    expect(prompt.system).toContain('My Novel');
    expect(prompt.user).toContain('Chapter 1');
    expect(prompt.user).toContain('Body text');
  });

  it('includes the novel name in the recap prompt', () => {
    const prompt = buildRecapPrompt('My Novel', 'notes here');

    expect(prompt.system).toContain('My Novel');
    expect(prompt.user).toBe('notes here');
  });
});
