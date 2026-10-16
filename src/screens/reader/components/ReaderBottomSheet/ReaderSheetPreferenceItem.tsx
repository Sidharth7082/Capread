import React, { Suspense } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../../../../theme/types';
import Switch from '@components/Switch/Switch';

interface ReaderSheetPreferenceItemProps {
  description?: string;
  label: string;
  value: boolean;
  onPress: () => void;
  theme: ThemeColors;
}

const ReaderSheetPreferenceItem: React.FC<ReaderSheetPreferenceItemProps> = ({
  description,
  label,
  value,
  onPress,
  theme,
}) => {
  return (
    <Pressable
      style={styles.container}
      android_ripple={{ color: theme.rippleColor }}
      onPress={onPress}
    >
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: theme.onSurface }]}>{label}</Text>
        {description ? (
          <Text style={[styles.description, { color: theme.onSurfaceVariant }]}>
            {description}
          </Text>
        ) : null}
      </View>
      <Suspense fallback={<View style={styles.fallback} />}>
        <Switch value={value} onValueChange={onPress} />
      </Suspense>
    </Pressable>
  );
};

export default ReaderSheetPreferenceItem;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontSize: 16,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  fallback: {
    width: 52,
    height: 32,
    borderRadius: 16,
  },
});
