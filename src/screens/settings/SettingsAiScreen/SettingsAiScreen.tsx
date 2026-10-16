import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';

import { Appbar, List, SafeAreaView } from '@components';
import { useAiSettings, useTheme } from '@hooks/persisted';
import { getString } from '@i18n/translations';
import { AiSettingsScreenProps } from '@navigators/types';

import SettingSwitch from '../components/SettingSwitch';

const CONTEXT_OPTIONS = [8000, 16000, 32000, 0];
const HISTORY_OPTIONS = [5, 10, 20];

const nextOption = (options: number[], current: number): number => {
  const index = options.indexOf(current);
  return options[(index + 1) % options.length];
};

const AiSettingsScreen = ({ navigation }: AiSettingsScreenProps) => {
  const theme = useTheme();
  const {
    enabled,
    baseUrl,
    apiKey,
    model,
    contextChars = 16000,
    historyTurns = 10,
    setAiSettings,
  } = useAiSettings();

  const [baseUrlInput, setBaseUrlInput] = useState(baseUrl);
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);
  const [modelInput, setModelInput] = useState(model);

  const contextLabel =
    contextChars === 0
      ? getString('aiSettingsScreen.contextFull')
      : getString('aiSettingsScreen.contextChars', {
          count: contextChars,
        });

  return (
    <SafeAreaView excludeTop>
      <Appbar
        title={getString('aiSettings')}
        handleGoBack={() => navigation.goBack()}
        theme={theme}
      />
      <ScrollView contentContainerStyle={styles.paddingBottom}>
        <List.Section>
          <List.SubHeader theme={theme}>
            {getString('aiSettingsScreen.general')}
          </List.SubHeader>
          <SettingSwitch
            label={getString('aiSettingsScreen.enableRecaps')}
            description={getString('aiSettingsScreen.enableRecapsDescription')}
            value={enabled}
            onPress={() => setAiSettings({ enabled: !enabled })}
            theme={theme}
          />
        </List.Section>
        <List.Section>
          <List.SubHeader theme={theme}>
            {getString('aiSettingsScreen.provider')}
          </List.SubHeader>
          <TextInput
            mode="outlined"
            label={getString('aiSettingsScreen.baseUrl')}
            value={baseUrlInput}
            onChangeText={setBaseUrlInput}
            onEndEditing={() => setAiSettings({ baseUrl: baseUrlInput.trim() })}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            underlineColor={theme.outline}
            theme={{ colors: { ...theme } }}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label={getString('aiSettingsScreen.apiKey')}
            value={apiKeyInput}
            onChangeText={setApiKeyInput}
            onEndEditing={() => setAiSettings({ apiKey: apiKeyInput.trim() })}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            underlineColor={theme.outline}
            theme={{ colors: { ...theme } }}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label={getString('aiSettingsScreen.model')}
            value={modelInput}
            onChangeText={setModelInput}
            onEndEditing={() => setAiSettings({ model: modelInput.trim() })}
            autoCapitalize="none"
            autoCorrect={false}
            underlineColor={theme.outline}
            theme={{ colors: { ...theme } }}
            style={styles.input}
          />
          <List.Item
            title={getString('aiSettingsScreen.localOnly')}
            description={getString('aiSettingsScreen.localOnlyDescription')}
            theme={theme}
          />
        </List.Section>
        <List.Section>
          <List.SubHeader theme={theme}>
            {getString('aiSettingsScreen.chapterAssistant')}
          </List.SubHeader>
          <List.Item
            title={getString('aiSettingsScreen.contextSize')}
            description={contextLabel}
            onPress={() =>
              setAiSettings({
                contextChars: nextOption(CONTEXT_OPTIONS, contextChars),
              })
            }
            theme={theme}
          />
          <List.Item
            title={getString('aiSettingsScreen.chatMemory')}
            description={getString('aiSettingsScreen.chatMemoryTurns', {
              count: historyTurns,
            })}
            onPress={() =>
              setAiSettings({
                historyTurns: nextOption(HISTORY_OPTIONS, historyTurns),
              })
            }
            theme={theme}
          />
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AiSettingsScreen;

const styles = StyleSheet.create({
  input: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  paddingBottom: {
    paddingBottom: 24,
  },
});
