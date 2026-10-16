import NativeBackgroundTasks from '@modules/native-background-tasks';
import { getString } from '@i18n/translations';
import { askForPostNotificationsPermission } from '@utils/askForPostNoftificationsPermission';

export const AUTOMATIC_LIBRARY_UPDATE_INTERVALS = [
  0, 12, 24, 48, 72, 168,
] as const;

export type AutomaticLibraryUpdateInterval =
  (typeof AUTOMATIC_LIBRARY_UPDATE_INTERVALS)[number];

export const configureAutomaticLibraryUpdates = async (
  intervalHours: AutomaticLibraryUpdateInterval,
) => {
  if (intervalHours === 0) {
    await NativeBackgroundTasks.cancelLibraryUpdates();
    return;
  }

  await askForPostNotificationsPermission();
  await NativeBackgroundTasks.scheduleLibraryUpdates(
    intervalHours,
    getString('notifications.UPDATE_LIBRARY'),
    getString('common.preparing'),
  );
};
