import { requireOptionalNativeModule } from 'expo-modules-core';

export type DohProviderId =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12;

type NativeDohModule = {
  getProvider(): DohProviderId;
  setProvider(provider: DohProviderId): void;
};

export default requireOptionalNativeModule<NativeDohModule>('NativeDoh');
