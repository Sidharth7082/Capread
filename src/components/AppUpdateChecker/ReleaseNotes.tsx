import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getString } from '@i18n/translations';
import { ThemeColors } from '@theme/types';

export type NoteBlock =
  | { type: 'heading'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'note'; text: string }
  | { type: 'paragraph'; text: string };

const inlineMarkdownPatterns: [RegExp, string][] = [
  [/\*\*(.+?)\*\*/g, '$1'],
  [/__(.+?)__/g, '$1'],
  [/`(.+?)`/g, '$1'],
  [/\[(.+?)\]\(.+?\)/g, '$1'],
];

const stripInline = (text: string) =>
  inlineMarkdownPatterns.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    text,
  );

/**
 * Release bodies are GitHub markdown. Renders the subset we write: headings,
 * bullets, paragraphs and `> [!NOTE]` callouts. Bold, code and links keep their
 * text but lose the syntax, since the dialog has no rich-text support.
 */
export const parseReleaseNotes = (markdown: string): NoteBlock[] => {
  const blocks: NoteBlock[] = [];
  let noteLines: string[] = [];

  const flushNote = () => {
    if (noteLines.length) {
      blocks.push({ type: 'note', text: stripInline(noteLines.join(' ')) });
      noteLines = [];
    }
  };

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim();

    if (line.startsWith('>')) {
      const quoted = line.replace(/^>\s?/, '');
      if (!/^\[!(NOTE|IMPORTANT|WARNING|TIP)\]$/.test(quoted)) {
        noteLines.push(quoted);
      }
      continue;
    }

    flushNote();

    if (!line) {
      continue;
    }

    if (/^#{1,6}\s/.test(line)) {
      blocks.push({
        type: 'heading',
        text: stripInline(line.replace(/^#{1,6}\s/, '')),
      });
    } else if (/^[-*·]\s/.test(line)) {
      blocks.push({
        type: 'bullet',
        text: stripInline(line.replace(/^[-*·]\s/, '')),
      });
    } else {
      blocks.push({ type: 'paragraph', text: stripInline(line) });
    }
  }

  flushNote();
  return blocks;
};

interface ReleaseNotesProps {
  markdown: string;
  theme: ThemeColors;
}

export const ReleaseNotes = ({ markdown, theme }: ReleaseNotesProps) => {
  const blocks = useMemo(() => parseReleaseNotes(markdown), [markdown]);

  return (
    <View>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading':
            return (
              <Text
                key={index}
                style={[styles.heading, { color: theme.onSurface }]}
              >
                {block.text}
              </Text>
            );
          case 'bullet':
            return (
              <View key={index} style={styles.bulletRow}>
                <Text
                  style={[styles.bulletDot, { color: theme.onSurfaceVariant }]}
                >
                  ·
                </Text>
                <Text
                  style={[styles.body, { color: theme.onSurfaceVariant }]}
                >
                  {block.text}
                </Text>
              </View>
            );
          case 'note':
            return (
              <View
                key={index}
                style={[
                  styles.note,
                  {
                    backgroundColor: theme.surfaceVariant,
                    borderLeftColor: theme.primary,
                  },
                ]}
              >
                <Text style={[styles.noteLabel, { color: theme.primary }]}>
                  {getString('appUpdate.note')}
                </Text>
                <Text style={[styles.body, { color: theme.onSurface }]}>
                  {block.text}
                </Text>
              </View>
            );
          default:
            return (
              <Text
                key={index}
                style={[styles.body, { color: theme.onSurfaceVariant }]}
              >
                {block.text}
              </Text>
            );
        }
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  bulletDot: {
    fontSize: 14,
    lineHeight: 19,
    marginRight: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  heading: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  note: {
    borderRadius: 6,
    borderLeftWidth: 3,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
});
