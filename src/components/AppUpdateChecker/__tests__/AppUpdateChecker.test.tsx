import { act, render, screen } from '@testing-library/react-native';

import AppUpdateChecker from '../AppUpdateChecker';
import { useAppUpdateChecker } from '../useAppUpdateChecker';

jest.mock('../useAppUpdateChecker', () => ({
  useAppUpdateChecker: jest.fn(),
}));

jest.mock('../AppUpdateDialog', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return function MockAppUpdateDialog({
    onDismiss,
    onIgnore,
  }: {
    onDismiss: () => void;
    onIgnore: () => void;
  }) {
    return React.createElement('View', {
      onDismiss,
      onIgnore,
      testID: 'app-update-dialog',
    });
  };
});

jest.mock('../WhatsNewDialog', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  return function MockWhatsNewDialog({ onClose }: { onClose: () => void }) {
    return React.createElement('View', {
      onClose,
      testID: 'app-whats-new-dialog',
    });
  };
});

const mockIgnoreVersion = jest.fn();
const mockDismissWhatsNew = jest.fn();
const mockAppRelease = {
  tag_name: 'v9.0.0',
  body: 'Release notes',
  downloadUrl: 'https://example.com/lnreader.apk',
};

describe('AppUpdateChecker', () => {
  beforeEach(() => {
    jest.mocked(useAppUpdateChecker).mockReturnValue({
      dismissWhatsNew: mockDismissWhatsNew,
      ignoreVersion: mockIgnoreVersion,
      isNewVersion: true,
      latestRelease: mockAppRelease,
      whatsNewRelease: undefined,
    });
  });

  it('shows what is new after installing before offering another update', () => {
    jest.mocked(useAppUpdateChecker).mockReturnValue({
      dismissWhatsNew: mockDismissWhatsNew,
      ignoreVersion: mockIgnoreVersion,
      isNewVersion: true,
      latestRelease: mockAppRelease,
      whatsNewRelease: mockAppRelease,
    });

    render(<AppUpdateChecker />);

    expect(screen.getByTestId('app-whats-new-dialog')).toBeTruthy();
    expect(screen.queryByTestId('app-update-dialog')).toBeNull();

    act(() => screen.getByTestId('app-whats-new-dialog').props.onClose());
    expect(mockDismissWhatsNew).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when no update is available', () => {
    jest.mocked(useAppUpdateChecker).mockReturnValue({
      dismissWhatsNew: mockDismissWhatsNew,
      ignoreVersion: mockIgnoreVersion,
      isNewVersion: false,
      latestRelease: undefined,
      whatsNewRelease: undefined,
    });

    render(<AppUpdateChecker />);

    expect(screen.queryByTestId('app-update-dialog')).toBeNull();
  });

  it('dismisses the current release for the session', () => {
    render(<AppUpdateChecker />);

    act(() => screen.getByTestId('app-update-dialog').props.onDismiss());

    expect(screen.queryByTestId('app-update-dialog')).toBeNull();
    expect(mockIgnoreVersion).not.toHaveBeenCalled();
  });

  it('persists the release tag when ignored', () => {
    render(<AppUpdateChecker />);

    act(() => screen.getByTestId('app-update-dialog').props.onIgnore());

    expect(mockIgnoreVersion).toHaveBeenCalledWith(mockAppRelease.tag_name);
  });
});
