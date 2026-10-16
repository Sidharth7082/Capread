import React from 'react';

import { Dialog, RadioButton } from '@components';
import { useAppSettings, useTheme } from '@hooks/persisted';
import { getString } from '@i18n/translations';
import {
  DATE_FORMATS,
  DateFormat,
  getDateFormatLabel,
} from '@utils/dateFormat';

interface DateFormatModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const DateFormatModal: React.FC<DateFormatModalProps> = ({
  visible,
  onDismiss,
}) => {
  const theme = useTheme();
  const { dateFormat = 'default', setAppSettings } = useAppSettings();

  const selectDateFormat = (value: DateFormat) => {
    setAppSettings({ dateFormat: value });
    onDismiss();
  };

  return (
    <Dialog.Root visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>{getString('appearanceScreen.dateFormat')}</Dialog.Title>
      <Dialog.List>
        {DATE_FORMATS.map(value => (
          <RadioButton
            key={value}
            status={dateFormat === value}
            onPress={() => selectDateFormat(value)}
            label={getDateFormatLabel(value)}
            theme={theme}
          />
        ))}
      </Dialog.List>
      <Dialog.Actions>
        <Dialog.Action onPress={onDismiss}>
          {getString('common.cancel')}
        </Dialog.Action>
      </Dialog.Actions>
    </Dialog.Root>
  );
};

export default DateFormatModal;
