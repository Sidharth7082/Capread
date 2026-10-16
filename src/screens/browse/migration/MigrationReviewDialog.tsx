import { StyleSheet, Text, View } from 'react-native';

import { Checkbox, Dialog, RadioButton } from '@components';
import { getString } from '@i18n/translations';
import type { MigrationNovelOptions } from '@services/backgroundTasks';
import type { ThemeColors } from '@theme/types';

interface MigrationReviewDialogProps {
  destinationName: string;
  options: MigrationNovelOptions;
  theme: ThemeColors;
  visible: boolean;
  onCancel: () => void;
  onChange: (options: MigrationNovelOptions) => void;
  onMigrate: () => void;
}

const MigrationReviewDialog = ({
  destinationName,
  options,
  theme,
  visible,
  onCancel,
  onChange,
  onMigrate,
}: MigrationReviewDialogProps) => (
  <Dialog.Root visible={visible} onDismiss={onCancel}>
    <Dialog.Header>
      <Dialog.Title>
        {getString('browseScreen.migration.reviewTitle')}
      </Dialog.Title>
      <Dialog.Description>
        {getString('browseScreen.migration.reviewDescription', {
          name: destinationName,
        })}
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Content>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>
          {getString('browseScreen.migration.cover')}
        </Text>
        <RadioButton
          label={getString('browseScreen.migration.useDestination')}
          status={options.cover === 'destination'}
          onPress={() => onChange({ ...options, cover: 'destination' })}
          style={styles.option}
          theme={theme}
        />
        <RadioButton
          label={getString('browseScreen.migration.keepCurrent')}
          status={options.cover === 'current'}
          onPress={() => onChange({ ...options, cover: 'current' })}
          style={styles.option}
          theme={theme}
        />
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.onSurface }]}>
          {getString('browseScreen.migration.metadata')}
        </Text>
        <RadioButton
          label={getString('browseScreen.migration.useDestination')}
          status={options.metadata === 'destination'}
          onPress={() => onChange({ ...options, metadata: 'destination' })}
          style={styles.option}
          theme={theme}
        />
        <RadioButton
          label={getString('browseScreen.migration.keepCurrent')}
          status={options.metadata === 'current'}
          onPress={() => onChange({ ...options, metadata: 'current' })}
          style={styles.option}
          theme={theme}
        />
      </View>
      <Checkbox
        label={getString('browseScreen.migration.redownloadChapters')}
        status={options.redownloadChapters}
        onPress={() =>
          onChange({
            ...options,
            redownloadChapters: !options.redownloadChapters,
          })
        }
        theme={theme}
        viewStyle={styles.option}
      />
      <Dialog.Description>
        {getString('browseScreen.migration.preservedState')}
      </Dialog.Description>
    </Dialog.Content>
    <Dialog.Actions>
      <Dialog.Action onPress={onCancel}>
        {getString('common.cancel')}
      </Dialog.Action>
      <Dialog.Action onPress={onMigrate}>
        {getString('novelScreen.migrate')}
      </Dialog.Action>
    </Dialog.Actions>
  </Dialog.Root>
);

export default MigrationReviewDialog;

const styles = StyleSheet.create({
  option: {
    paddingHorizontal: 0,
  },
  section: {
    gap: 2,
  },
  sectionTitle: {
    fontWeight: '600',
  },
});
