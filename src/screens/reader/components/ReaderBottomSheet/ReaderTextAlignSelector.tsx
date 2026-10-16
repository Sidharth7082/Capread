import { StyleSheet, Text, TextStyle, View } from 'react-native';
import React from 'react';

import { useChapterReaderSettings, useTheme } from '@hooks/persisted';
import { SegmentedControl, SegmentedControlOption } from '@components';
import { getString } from '@i18n/translations';

interface ReaderTextAlignSelectorProps {
  labelStyle?: TextStyle | TextStyle[];
}

const ReaderTextAlignSelector: React.FC<ReaderTextAlignSelectorProps> = ({
  labelStyle,
}) => {
  const theme = useTheme();
  const { textAlign, setChapterReaderSettings } = useChapterReaderSettings();
  const options: SegmentedControlOption[] = [
    {
      icon: 'format-align-left',
      label: getString('readerScreen.bottomSheet.alignLeft'),
      value: 'left',
    },
    {
      icon: 'format-align-center',
      label: getString('readerScreen.bottomSheet.alignCenter'),
      value: 'center',
    },
    {
      icon: 'format-align-justify',
      label: getString('readerScreen.bottomSheet.alignJustify'),
      value: 'justify',
    },
    {
      icon: 'format-align-right',
      label: getString('readerScreen.bottomSheet.alignRight'),
      value: 'right',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={[{ color: theme.onSurfaceVariant }, labelStyle]}>
        {getString('readerScreen.bottomSheet.textAlign')}
      </Text>
      <SegmentedControl
        options={options}
        value={textAlign}
        onChange={value => setChapterReaderSettings({ textAlign: value })}
        showCheckIcon={false}
        showLabels={false}
        theme={theme}
      />
    </View>
  );
};

export default ReaderTextAlignSelector;

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
