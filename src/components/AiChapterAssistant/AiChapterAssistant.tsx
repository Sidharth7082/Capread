import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { IconButton, TextInput } from 'react-native-paper';

import { Button, Dialog } from '@components';
import { useAiSettings, useTheme } from '@hooks/persisted';
import { getString } from '@i18n/translations';
import {
  clearChapterChatMessages,
  getChapterChatMessages,
  getChapterSummary,
} from '@database/queries/ChapterAiQueries';
import type { ChapterChatMessageRow } from '@database/schema';
import { askAboutChapter, summarizeChapter } from '@services/ai/chapter';
import { showToast } from '@utils/showToast';
import * as Clipboard from 'expo-clipboard';

export interface AiChapterAssistantProps {
  chapter: { id: number; name: string };
  novelId: number;
  visible: boolean;
  onDismiss: () => void;
}

const AiChapterAssistant = ({
  chapter,
  novelId,
  visible,
  onDismiss,
}: AiChapterAssistantProps) => {
  const theme = useTheme();
  const aiSettings = useAiSettings();
  const scrollRef = useRef<ScrollView>(null);

  const [summary, setSummary] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChapterChatMessageRow[]>([]);
  const [question, setQuestion] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [asking, setAsking] = useState(false);

  const configured = Boolean(
    aiSettings.baseUrl.trim() && aiSettings.model.trim(),
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;
    Promise.all([
      getChapterSummary(chapter.id),
      getChapterChatMessages(chapter.id),
    ])
      .then(([storedSummary, storedMessages]) => {
        if (!cancelled) {
          setSummary(storedSummary?.summary ?? null);
          setMessages(storedMessages);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
          setMessages([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chapter.id, visible]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );
  }, []);

  const handleSummarize = useCallback(async () => {
    if (!configured) {
      showToast(getString('aiAssistant.notConfigured'));
      return;
    }

    setSummarizing(true);
    try {
      const result = await summarizeChapter(
        { novelId, chapterId: chapter.id },
        {
          baseUrl: aiSettings.baseUrl,
          apiKey: aiSettings.apiKey,
          model: aiSettings.model,
        },
        { contextChars: aiSettings.contextChars },
      );
      setSummary(result);
    } catch (error) {
      showToast(
        `${getString('aiAssistant.failed')}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setSummarizing(false);
    }
  }, [
    aiSettings.apiKey,
    aiSettings.baseUrl,
    aiSettings.contextChars,
    aiSettings.model,
    chapter.id,
    configured,
    novelId,
  ]);

  const handleAsk = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed || asking) {
      return;
    }

    if (!configured) {
      showToast(getString('aiAssistant.notConfigured'));
      return;
    }

    const history = messages.map(message => ({
      role:
        message.role === 'assistant'
          ? ('assistant' as const)
          : ('user' as const),
      content: message.content,
    }));

    setAsking(true);
    try {
      const answer = await askAboutChapter(
        { novelId, chapterId: chapter.id },
        trimmed,
        history,
        {
          baseUrl: aiSettings.baseUrl,
          apiKey: aiSettings.apiKey,
          model: aiSettings.model,
        },
        {
          contextChars: aiSettings.contextChars,
          historyTurns: aiSettings.historyTurns,
        },
      );
      setQuestion('');
      setMessages(await getChapterChatMessages(chapter.id));
      scrollToEnd();
      if (!answer) {
        throw new Error('Empty answer');
      }
    } catch (error) {
      showToast(
        `${getString('aiAssistant.failed')}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setAsking(false);
    }
  }, [
    aiSettings.apiKey,
    aiSettings.baseUrl,
    aiSettings.contextChars,
    aiSettings.historyTurns,
    aiSettings.model,
    asking,
    chapter.id,
    configured,
    messages,
    novelId,
    question,
    scrollToEnd,
  ]);

  const handleClear = useCallback(async () => {
    await clearChapterChatMessages(chapter.id);
    setMessages([]);
    showToast(getString('aiAssistant.cleared'));
  }, [chapter.id]);

  const handleCopySummary = useCallback(() => {
    if (!summary) {
      return;
    }
    void Clipboard.setStringAsync(summary).then(() =>
      showToast(getString('aiAssistant.summaryCopied')),
    );
  }, [summary]);

  const contextLimitNote =
    aiSettings.contextChars && aiSettings.contextChars > 0
      ? getString('aiAssistant.contextLimit', {
          count: aiSettings.contextChars,
        })
      : null;

  return (
    <Dialog.Root visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>{getString('aiAssistant.title')}</Dialog.Title>
      <Dialog.ScrollArea>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          testID="ai-assistant-messages"
        >
          {summary ? (
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: theme.surfaceVariant },
              ]}
            >
              <View style={styles.summaryHeader}>
                <Text style={[styles.label, { color: theme.onSurfaceVariant }]}>
                  {getString('aiAssistant.summary')}
                </Text>
                <IconButton
                  accessibilityLabel={getString('aiAssistant.copySummary')}
                  icon="content-copy"
                  size={16}
                  onPress={handleCopySummary}
                  iconColor={theme.onSurfaceVariant}
                  style={styles.summaryCopy}
                />
              </View>
              <Text style={{ color: theme.onSurface }}>{summary}</Text>
            </View>
          ) : null}

          {!messages.length && !summary ? (
            <Text style={{ color: theme.onSurfaceVariant }}>
              {getString('aiAssistant.empty')}
            </Text>
          ) : null}

          {messages.map(message => (
            <View
              key={message.id}
              style={[
                styles.bubble,
                message.role === 'user'
                  ? [styles.userBubble, { backgroundColor: theme.primary }]
                  : [
                      styles.assistantBubble,
                      { backgroundColor: theme.surfaceVariant },
                    ],
              ]}
            >
              <Text
                style={{
                  color:
                    message.role === 'user' ? theme.onPrimary : theme.onSurface,
                }}
              >
                {message.content}
              </Text>
            </View>
          ))}

          {asking ? (
            <Text style={{ color: theme.onSurfaceVariant }}>
              {getString('aiAssistant.thinking')}
            </Text>
          ) : null}

          {contextLimitNote && (summary || messages.length) ? (
            <Text style={[styles.note, { color: theme.onSurfaceVariant }]}>
              {contextLimitNote}
            </Text>
          ) : null}
        </ScrollView>
      </Dialog.ScrollArea>
      <View style={styles.inputRow}>
        <TextInput
          mode="outlined"
          dense
          placeholder={getString('aiAssistant.placeholder')}
          value={question}
          onChangeText={setQuestion}
          onSubmitEditing={handleAsk}
          editable={!asking}
          underlineColor={theme.outline}
          theme={{ colors: { ...theme } }}
          style={styles.input}
        />
        <Button
          title={getString('aiAssistant.send')}
          disabled={asking || !question.trim()}
          onPress={handleAsk}
        />
      </View>
      <Dialog.Actions>
        <Dialog.Action
          title={
            summary
              ? getString('aiAssistant.regenerate')
              : getString('aiAssistant.summarize')
          }
          disabled={summarizing}
          onPress={handleSummarize}
        />
        {messages.length ? (
          <Dialog.Action
            title={getString('aiAssistant.clear')}
            disabled={asking}
            onPress={handleClear}
          />
        ) : null}
        <Dialog.Action
          title={getString('common.cancel')}
          disabled={asking}
          onPress={onDismiss}
        />
      </Dialog.Actions>
      {summarizing ? (
        <View style={styles.progress}>
          <ActivityIndicator color={theme.primary} />
          <Text style={[styles.note, { color: theme.onSurfaceVariant }]}>
            {getString('aiAssistant.summarizing')}
          </Text>
        </View>
      ) : null}
    </Dialog.Root>
  );
};

export default AiChapterAssistant;

const styles = StyleSheet.create({
  assistantBubble: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
  },
  bubble: {
    maxWidth: '90%',
  },
  input: {
    flex: 1,
    marginRight: 8,
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  note: {
    fontSize: 12,
  },
  progress: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  scroll: {
    maxHeight: 360,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryCard: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryCopy: {
    margin: -6,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
  },
});
