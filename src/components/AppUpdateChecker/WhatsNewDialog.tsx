import { StyleSheet, useWindowDimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { getString } from '@i18n/translations';
import { useTheme } from '@hooks/persisted';

import { Dialog } from '../Dialog';
import { ReleaseNotes } from './ReleaseNotes';
import type { AppRelease } from './useAppUpdateChecker';

interface WhatsNewDialogProps {
  release: AppRelease;
  onClose: () => void;
}

/**
 * Shown once after installing an update, so the user can read what changed
 * without leaving the app.
 */
const WhatsNewDialog = ({ release, onClose }: WhatsNewDialogProps) => {
  const theme = useTheme();
  const maxContentHeight = useWindowDimensions().height / 2;

  return (
    <Dialog.Root visible onDismiss={onClose}>
      <Dialog.Title>
        {`${getString('appUpdate.whatsNew')} ${release.tag_name}`}
      </Dialog.Title>
      <Dialog.ScrollArea>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          style={{ maxHeight: maxContentHeight }}
          testID="app-whats-new-release-notes"
        >
          <ReleaseNotes markdown={release.body} theme={theme} />
        </ScrollView>
      </Dialog.ScrollArea>
      <Dialog.Actions>
        <Dialog.Action title={getString('common.ok')} onPress={onClose} />
      </Dialog.Actions>
    </Dialog.Root>
  );
};

export default WhatsNewDialog;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
});
