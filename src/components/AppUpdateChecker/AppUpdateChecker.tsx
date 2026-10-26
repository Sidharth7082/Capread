import { useCallback, useState } from 'react';

import AppUpdateDialog from './AppUpdateDialog';
import WhatsNewDialog from './WhatsNewDialog';
import { useAppUpdateChecker } from './useAppUpdateChecker';

const AppUpdateChecker = () => {
  const {
    dismissWhatsNew,
    ignoreVersion,
    isNewVersion,
    latestRelease,
    whatsNewRelease,
  } = useAppUpdateChecker();
  const [dismissedVersion, setDismissedVersion] = useState<string>();

  const versionTag = latestRelease?.tag_name;

  const dismissUpdate = useCallback(() => {
    setDismissedVersion(versionTag);
  }, [versionTag]);

  const ignoreUpdate = useCallback(() => {
    if (versionTag) {
      ignoreVersion(versionTag);
    }
  }, [ignoreVersion, versionTag]);

  // Right after installing, show what changed in the running version first.
  if (whatsNewRelease) {
    return (
      <WhatsNewDialog release={whatsNewRelease} onClose={dismissWhatsNew} />
    );
  }

  if (
    !isNewVersion ||
    !latestRelease ||
    dismissedVersion === latestRelease.tag_name
  ) {
    return null;
  }

  return (
    <AppUpdateDialog
      release={latestRelease}
      onDismiss={dismissUpdate}
      onIgnore={ignoreUpdate}
    />
  );
};

export default AppUpdateChecker;
