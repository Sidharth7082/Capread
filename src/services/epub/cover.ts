/**
 * Resolves the cover URI stored on a novel to the local file path that the
 * EPUB exporter can read.
 *
 * Covers are stored as `file://…/cover.png?<timestamp>` so the image cache
 * refreshes when a cover is replaced or refreshed from the source. The query
 * string and fragment are not part of the file name; passing them through
 * makes the export fail to find the file and embed no cover.
 *
 * Remote URLs are dropped: the exporter only reads local files, so a remote
 * cover would silently produce an EPUB without a cover either way.
 */
export const resolveEpubCoverPath = (cover?: string | null): string => {
  const trimmed = cover?.trim() ?? '';
  if (!trimmed.startsWith('file://') && !trimmed.startsWith('/')) {
    return '';
  }
  return trimmed.split(/[?#]/)[0];
};
