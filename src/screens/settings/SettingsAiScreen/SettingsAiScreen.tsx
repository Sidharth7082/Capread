import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';

import { Appbar, List, SafeAreaView } from '@components';
import { useAiSettings, useTheme } from '@hooks/persisted';
import { getString } from '@i18n/translations';
import { AiSettingsScreenProps } from '@navigators/types';

import SettingSwitch from '../components/SettingSwitch';

const AiSettingsScreen = ({ navigation }: AiSettingsScreenProps) => {
  const theme = useTheme();
  const { enabled, baseUrl, apiKey, model, setAiSettings } = useAiSettings();

  const [baseUrlInput, setBaseUrlInput] = useState(baseUrl);
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);
  const [modelInput, setModelInput] = useState(model);

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
