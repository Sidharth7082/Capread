import { fireEvent, render, screen } from '@testing-library/react-native';

import SettingsAiScreen from '../SettingsAiScreen';

const mockSetAiSettings = jest.fn();

jest.mock('@hooks/persisted', () => ({
  useAiSettings: () => ({
    enabled: true,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: '',
    contextChars: 16000,
    historyTurns: 10,
    setAiSettings: mockSetAiSettings,
  }),
  useTheme: () => ({
    background: '#111',
    rippleColor: '#222',
    onSurface: '#333',
    onSurfaceVariant: '#444',
    primary: '#555',
  }),
}));

jest.mock('@i18n/translations', () => ({
  getString: (key: string) => key,
}));

jest.mock('react-native-paper', () => {
  const React = require('react');
  const { TextInput } = require('react-native');

  return {
    TextInput: (props: any) =>
      React.createElement(TextInput, { ...props, testID: props.label }),
  };
});

jest.mock('@components', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');

  const PassThrough = ({ children }: any) =>
    React.createElement(React.Fragment, null, children);

  const List: any = () => null;
  List.Section = PassThrough;
  List.SubHeader = () => null;
  List.Item = ({ title, onPress }: any) =>
    React.createElement(
      Pressable,
      { onPress },
      React.createElement(Text, null, title),
    );

  return {
    SafeAreaView: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    Appbar: () => null,
    List,
    SwitchItem: ({ label, onPress }: any) =>
      React.createElement(
        Pressable,
        { onPress },
        React.createElement(Text, null, label),
      ),
  };
});

const renderScreen = () =>
  render(<SettingsAiScreen navigation={{} as any} route={{} as any} />);

describe('SettingsAiScreen', () => {
  beforeEach(() => {
    mockSetAiSettings.mockClear();
  });

  it('persists the model as it is typed, without waiting for a blur', () => {
    renderScreen();

    fireEvent.changeText(
      screen.getByTestId('aiSettingsScreen.model'),
      'deepseek-flash',
    );

    expect(mockSetAiSettings).toHaveBeenLastCalledWith({
      model: 'deepseek-flash',
    });
  });

  it('persists the base URL trimmed as it is typed', () => {
    renderScreen();

    fireEvent.changeText(
      screen.getByTestId('aiSettingsScreen.baseUrl'),
      '  https://api.deepseek.com  ',
    );

    expect(mockSetAiSettings).toHaveBeenLastCalledWith({
      baseUrl: 'https://api.deepseek.com',
    });
  });

  it('persists the API key as it is typed', () => {
    renderScreen();

    fireEvent.changeText(
      screen.getByTestId('aiSettingsScreen.apiKey'),
      'sk-test',
    );

    expect(mockSetAiSettings).toHaveBeenLastCalledWith({
      apiKey: 'sk-test',
    });
  });

  it('shows the auto-save hint so no save button is expected', () => {
    renderScreen();

    expect(screen.getByText('aiSettingsScreen.autoSave')).toBeTruthy();
  });
});
