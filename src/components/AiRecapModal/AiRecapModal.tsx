import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Dialog } from '@components';
import { useAiSettings, useTheme } from '@hooks/persisted';
import { getString } from '@i18n/translations';
import { getNovelRecap } from '@database/queries/RecapQueries';
import type { NovelRecapRow } from '@database/schema';
import { generateNovelRecap, RecapProgress } from '@services/ai/recap';
import { showToast } from '@utils/showToast';

export interface AiRecapModalProps {
  novel: { id: number; name: string };
  /**
   * The recap covers read chapters before this chapter. When omitted, every
   * read chapter of the novel is covered.
   */
  upToChapterId?: number;
  visible: boolean;
  onDismiss: () => void;
}

const AiRecapModal = ({
  novel,
  upToChapterId,
  visible,
  onDismiss,
}: AiRecapModalProps) => {
  const theme = useTheme();
  const aiSettings = useAiSettings();

  const [recap, setRecap] = useState<NovelRecapRow | null>(null);
  const [loadingStored, setLoadingStored] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<RecapProgress | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;
    setLoadingStored(true);
    getNovelRecap(novel.id)
      .then(stored => {
        if (!cancelled) {
          setRecap(stored ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecap(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingStored(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visible, novel.id]);

  const configured = Boolean(
    aiSettings.baseUrl.trim() && aiSettings.model.trim(),
  );

  const handleGenerate = useCallback(async () => {
    if (!configured) {
      showToast(getString('recapScreen.notConfigured'));
      return;
    }

    setGenerating(true);
    setProgress({ completedSteps: 0, totalSteps: 1 });

    try {
      await generateNovelRecap({
        novelId: novel.id,
        upToChapterId,
        config: {
          baseUrl: aiSettings.baseUrl,
          apiKey: aiSettings.apiKey,
          model: aiSettings.model,
        },
        onProgress: setProgress,
      });
      const stored = await getNovelRecap(novel.id);
      setRecap(stored ?? null);
    } catch (error) {
      showToast(
        `${getString('recapScreen.failed')}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }, [
    aiSettings.apiKey,
    aiSettings.baseUrl,
    aiSettings.model,
    configured,
    novel.id,
    upToChapterId,
  ]);

  const handleDismiss = useCallback(() => {
    if (!generating) {
      onDismiss();
    }
  }, [generating, onDismiss]);

  const renderContent = () => {
    if (generating) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} />
          <Text
            style={[styles.progressText, { color: theme.onSurfaceVariant }]}
          >
            {getString('recapScreen.generating', {
              completed: progress?.completedSteps ?? 0,
              total: progress?.totalSteps ?? 1,
            })}
          </Text>
        </View>
      );
    }

    if (loadingStored) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} />
        </View>
      );
    }

    if (!recap?.summary) {
      return (
        <Text style={{ color: theme.onSurfaceVariant }}>
          {getString('recapScreen.empty')}
        </Text>
      );
    }

    return (
      <ScrollView style={styles.summaryScroll}>
        <Text style={{ color: theme.onSurface }}>{recap.summary}</Text>
        <Text style={[styles.metaText, { color: theme.onSurfaceVariant }]}>
          {getString('recapScreen.chaptersCovered', {
            count: recap.chaptersCovered,
          })}
        </Text>
      </ScrollView>
    );
  };

  return (
    <Dialog.Root visible={visible} onDismiss={handleDismiss}>
      <Dialog.Title>{getString('recapScreen.title')}</Dialog.Title>
      <Dialog.Content>{renderContent()}</Dialog.Content>
      <Dialog.Actions>
        <Dialog.Action onPress={handleDismiss} disabled={generating}>
          {getString('common.close')}
        </Dialog.Action>
        <Dialog.Action onPress={handleGenerate} disabled={generating}>
          {recap?.summary
            ? getString('recapScreen.regenerate')
            : getString('recapScreen.generate')}
        </Dialog.Action>
      </Dialog.Actions>
    </Dialog.Root>
  );
};

export default AiRecapModal;

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  metaText: {
    fontSize: 12,
    marginTop: 12,
  },
  progressText: {
    fontSize: 14,
  },
  summaryScroll: {
    maxHeight: 320,
  },
});
