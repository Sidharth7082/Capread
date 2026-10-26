import { useCallback, useEffect, useState } from 'react';
import DeviceInfo from 'react-native-device-info';

import { newer } from '@utils/compareVersion';
import { MMKVStorage } from '@utils/mmkv/mmkv';

import { version } from '../../../package.json';

interface AppUpdate {
  isNewVersion: boolean;
  latestRelease?: AppRelease;
  whatsNewRelease?: AppRelease;
  dismissWhatsNew: () => void;
  ignoreVersion: (versionTag: string) => void;
}

interface GithubReleaseAsset {
  name?: string;
  browser_download_url?: string;
}

interface GithubRelease {
  tag_name?: string;
  body?: string;
  assets?: GithubReleaseAsset[];
}

export interface AppRelease {
  tag_name: string;
  body: string;
  downloadUrl?: string;
}

const LATEST_RELEASE_URL =
  'https://api.github.com/repos/Sidharth7082/Capread/releases/latest';
const LAST_UPDATE_CHECK_KEY = 'LAST_UPDATE_CHECK';
const IGNORED_UPDATE_VERSION_KEY = 'IGNORED_UPDATE_VERSION';
const CACHED_RELEASE_KEY = 'CACHED_LATEST_RELEASE';
const LAST_SEEN_VERSION_KEY = 'LAST_SEEN_VERSION';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const getReleaseDownloadUrl = async (
  assets: GithubReleaseAsset[] = [],
): Promise<string | undefined> => {
  const apkAssets = assets.filter(asset => {
    return asset.name?.endsWith('.apk') && asset.browser_download_url;
  });
  const universalAsset = apkAssets.find(asset =>
    asset.name?.endsWith('-universal.apk'),
  );

  try {
    const supportedAbis = await DeviceInfo.supportedAbis();

    for (const abi of supportedAbis) {
      const matchingAsset = apkAssets.find(asset =>
        asset.name?.endsWith(`-${abi}.apk`),
      );

      if (matchingAsset?.browser_download_url) {
        return matchingAsset.browser_download_url;
      }
    }
  } catch {
    // Fall back to the universal APK when ABI detection is unavailable.
  }

  return (
    universalAsset?.browser_download_url || apkAssets[0]?.browser_download_url
  );
};

const shouldCheckForUpdate = (): boolean => {
  const lastCheckTime = MMKVStorage.getNumber(LAST_UPDATE_CHECK_KEY);
  if (!lastCheckTime) {
    return true;
  }

  return Date.now() - lastCheckTime >= ONE_DAY_MS;
};

const isNewerVersion = (versionTag: string): boolean => {
  const normalizedVersion = versionTag.replace(/[^\d.]/, '');
  return newer(normalizedVersion, `${version}`);
};

/**
 * Notes for the version that is now running, cached by an earlier update
 * check. Missing on a fresh install, which has nothing to compare against.
 */
const getPendingWhatsNew = (): AppRelease | undefined => {
  const lastSeenVersion = MMKVStorage.getString(LAST_SEEN_VERSION_KEY);
  if (!lastSeenVersion || lastSeenVersion === `${version}`) {
    return undefined;
  }

  try {
    const cached = JSON.parse(
      MMKVStorage.getString(CACHED_RELEASE_KEY) ?? 'null',
    ) as AppRelease | null;

    return cached?.tag_name.replace(/^v/, '') === `${version}`
      ? cached
      : undefined;
  } catch {
    return undefined;
  }
};

export const useAppUpdateChecker = (): AppUpdate => {
  const [checking, setChecking] = useState(true);
  const [latestRelease, setLatestRelease] = useState<AppRelease>();
  const [ignoredVersion, setIgnoredVersion] = useState(() =>
    MMKVStorage.getString(IGNORED_UPDATE_VERSION_KEY),
  );
  const [whatsNewRelease, setWhatsNewRelease] = useState<
    AppRelease | undefined
  >(getPendingWhatsNew);

  const dismissWhatsNew = useCallback(() => {
    MMKVStorage.set(LAST_SEEN_VERSION_KEY, `${version}`);
    setWhatsNewRelease(undefined);
  }, []);

  const ignoreVersion = useCallback((versionTag: string) => {
    MMKVStorage.set(IGNORED_UPDATE_VERSION_KEY, versionTag);
    setIgnoredVersion(versionTag);
  }, []);

  const checkForRelease = useCallback(async () => {
    if (!shouldCheckForUpdate()) {
      setChecking(false);
      return;
    }

    try {
      const response = await fetch(LATEST_RELEASE_URL);

      if (!response.ok) {
        setChecking(false);
        return;
      }

      const data = (await response.json()) as GithubRelease;

      if (!data.tag_name) {
        setChecking(false);
        return;
      }

      const downloadUrl = await getReleaseDownloadUrl(data.assets);
      const release: AppRelease = {
        tag_name: data.tag_name,
        body: data.body ?? '',
        downloadUrl,
      };

      MMKVStorage.set(LAST_UPDATE_CHECK_KEY, Date.now());
      MMKVStorage.set(CACHED_RELEASE_KEY, JSON.stringify(release));
      // Already running the advertised version, so its notes were offered.
      if (data.tag_name.replace(/^v/, '') === `${version}`) {
        MMKVStorage.set(LAST_SEEN_VERSION_KEY, `${version}`);
      }
      setLatestRelease(release);
      setChecking(false);
    } catch {
      // Silently fail in offline mode or on network errors.
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkForRelease();
  }, [checkForRelease]);

  const isNewVersion =
    !checking &&
    latestRelease !== undefined &&
    latestRelease.tag_name !== ignoredVersion &&
    isNewerVersion(latestRelease.tag_name);

  return {
    latestRelease,
    isNewVersion,
    whatsNewRelease,
    dismissWhatsNew,
    ignoreVersion,
  };
};
