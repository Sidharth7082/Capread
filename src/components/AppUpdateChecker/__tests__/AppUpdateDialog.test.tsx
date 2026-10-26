import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Linking from 'expo-linking';

import AppUpdateDialog from '../AppUpdateDialog';

jest.mock('@i18n/translations', () => ({
  getString: (key: string) =>
    ({
      'appUpdate.download': 'Download',
      'appUpdate.newVersionAvailable': 'New version available!',
      'appUpdate.notNow': 'Not now',
      'appUpdate.note': 'Note',
      'appUpdate.onVersion': "You're on",
      'appUpdate.whatsNew': "What's new in",
      'common.ok': 'Ok',
      'common.skipVersion': 'Skip version',
    }[key] ?? key),
}));

jest.mock('@hooks/persisted', () => ({
  useTheme: () => ({
    onSurface: '#1d1b20',
    onSurfaceVariant: '#49454f',
    outlineVariant: '#cac4d0',
    primary: '#6750a4',
    scrim: '#000000',
    surface: '#fffbfe',
    surfaceContainerHigh: '#ece6f0',
    surfaceVariant: '#e7e0ec',
  }),
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

const release = {
  tag_name: 'v9.0.0',
  body: '## Changes\n- First\n- Second\n',
  downloadUrl: 'https://example.com/lnreader.apk',
};

describe('AppUpdateDialog', () => {
  it('renders the release notes as formatted blocks', () => {
    render(
      <AppUpdateDialog
        release={release}
        onDismiss={jest.fn()}
        onIgnore={jest.fn()}
      />,
    );

    expect(screen.getByText('New version available!')).toBeTruthy();
    expect(screen.getByText('v9.0.0')).toBeTruthy();
    expect(screen.getByText(/You're on v\d/)).toBeTruthy();
    expect(screen.getByText('Changes')).toBeTruthy();
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
    expect(screen.getByTestId('app-update-release-notes').props.style).toEqual({
      maxHeight: expect.any(Number),
    });
    expect(
      screen.getByTestId('app-update-release-notes').props
        .contentContainerStyle,
    ).toEqual({
      paddingHorizontal: 24,
      paddingVertical: 8,
    });
  });

  it('renders note callouts from GitHub admonitions', () => {
    render(
      <AppUpdateDialog
        release={{
          ...release,
          body: '> [!NOTE]\n> Backup format changes next version.',
        }}
        onDismiss={jest.fn()}
        onIgnore={jest.fn()}
      />,
    );

    expect(screen.getByText('Note')).toBeTruthy();
    expect(
      screen.getByText('Backup format changes next version.'),
    ).toBeTruthy();
  });

  it('exposes dismiss, skip, and download actions', () => {
    const onDismiss = jest.fn();
    const onIgnore = jest.fn();

    render(
      <AppUpdateDialog
        release={release}
        onDismiss={onDismiss}
        onIgnore={onIgnore}
      />,
    );

    fireEvent.press(screen.getByText('Not now'));
    fireEvent.press(screen.getByText('Skip version'));
    fireEvent.press(screen.getByText('Download'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onIgnore).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith(release.downloadUrl);
  });
});
