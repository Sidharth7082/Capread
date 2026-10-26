import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as Linking from 'expo-linking';
import { ScrollView } from 'react-native-gesture-handler';

import { getString } from '@i18n/translations';
import { useTheme } from '@hooks/persisted';

import { Dialog } from '../Dialog';
import { ReleaseNotes } from './ReleaseNotes';
import type { AppRelease } from './useAppUpdateChecker';
import { version } from '../../../package.json';

interface AppUpdateDialogProps {
  release: AppRelease;
  onDismiss: () => void;
  onIgnore: () => void;
}

const AppUpdateDialog = ({
  release,
  onDismiss,
  onIgnore,
}: AppUpdateDialogProps) => {
  const theme = useTheme();
  const maxContentHeight = useWindowDimensions().height / 2;

  const installUpdate = () => {
    if (release.downloadUrl) {
      void Linking.openURL(release.downloadUrl);
    }
  };

  return (
    <Dialog.Root visible onDismiss={onDismiss}>
      <Dialog.Title>{getString('appUpdate.newVersionAvailable')}</Dialog.Title>
      <View style={styles.versionRow}>
        <Text style={[styles.version, { color: theme.primary }]}>
          {release.tag_name}
        </Text>
        <Text style={[styles.currentVersion, { color: theme.onSurfaceVariant }]}>
          {`${getString('appUpdate.onVersion')} v${version}`}
        </Text>
      </View>
      <Dialog.ScrollArea>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          style={{ maxHeight: maxContentHeight }}
          testID="app-update-release-notes"
        >
          <ReleaseNotes markdown={release.body} theme={theme} />
        </ScrollView>
      </Dialog.ScrollArea>
      <Dialog.Actions>
        <Dialog.Action
          title={getString('appUpdate.notNow')}
          onPress={onDismiss}
        />
        <Dialog.Action
          title={getString('common.skipVersion')}
          onPress={onIgnore}
        />
        <Dialog.Action
          title={getString('appUpdate.download')}
          disabled={!release.downloadUrl}
          onPress={installUpdate}
        />
      </Dialog.Actions>
    </Dialog.Root>
  );
};

export default AppUpdateDialog;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  versionRow: {
    paddingHorizontal: 24,
  },
  version: {
    fontSize: 20,
    fontWeight: '600',
  },
  currentVersion: {
    fontSize: 13,
    marginBottom: 8,
  },
});
