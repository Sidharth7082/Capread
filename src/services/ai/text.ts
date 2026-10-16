import { load } from 'cheerio';

export const normalizeWhitespace = (text: string): string =>
  text
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v\u00a0 ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const htmlToPlainText = (html: string): string => {
  const $ = load(html);
  $('script, style, noscript, template').remove();
  $('br').replaceWith('\n');
  $('p, div, section, article, li, blockquote, h1, h2, h3, h4, h5, h6').each(
    (_, element) => {
      $(element).append('\n');
    },
  );
  return normalizeWhitespace($.root().text());
};

export const truncateText = (text: string, cap: number): string =>
  text.length <= cap ? text : `${text.slice(0, cap)}…`;
