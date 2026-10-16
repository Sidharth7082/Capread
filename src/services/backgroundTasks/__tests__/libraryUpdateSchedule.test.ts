import NativeBackgroundTasks from '@modules/native-background-tasks';
import { askForPostNotificationsPermission } from '@utils/askForPostNoftificationsPermission';
import {
  AUTOMATIC_LIBRARY_UPDATE_INTERVALS,
  configureAutomaticLibraryUpdates,
} from '../libraryUpdateSchedule';

jest.mock('@modules/native-background-tasks', () => ({
  __esModule: true,
  default: {
    cancelLibraryUpdates: jest.fn(),
    scheduleLibraryUpdates: jest.fn(),
  },
}));

jest.mock('@utils/askForPostNoftificationsPermission', () => ({
  askForPostNotificationsPermission: jest.fn(),
}));

jest.mock('@i18n/translations', () => ({
  getString: (key: string) => key,
}));

const mockNativeBackgroundTasks = jest.mocked(NativeBackgroundTasks);
const mockAskForPostNotificationsPermission = jest.mocked(
  askForPostNotificationsPermission,
);

describe('automatic library update scheduling', () => {
  it('exposes the supported fixed intervals', () => {
    expect(AUTOMATIC_LIBRARY_UPDATE_INTERVALS).toEqual([
      0, 12, 24, 48, 72, 168,
    ]);
  });

  it('cancels scheduled work when automatic updates are disabled', async () => {
    await configureAutomaticLibraryUpdates(0);

    expect(
      mockNativeBackgroundTasks.cancelLibraryUpdates,
    ).toHaveBeenCalledTimes(1);
    expect(
      mockNativeBackgroundTasks.scheduleLibraryUpdates,
    ).not.toHaveBeenCalled();
    expect(mockAskForPostNotificationsPermission).not.toHaveBeenCalled();
  });

  it('requests notification permission and schedules the selected interval', async () => {
    await configureAutomaticLibraryUpdates(24);

    expect(mockAskForPostNotificationsPermission).toHaveBeenCalledTimes(1);
    expect(
      mockNativeBackgroundTasks.scheduleLibraryUpdates,
    ).toHaveBeenCalledWith(
      24,
      'notifications.UPDATE_LIBRARY',
      'common.preparing',
    );
  });
});
