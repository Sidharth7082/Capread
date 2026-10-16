export type BackupOptions = {
  library: boolean;
  settings: boolean;
  plugins: boolean;
  downloadedFiles: boolean;
  /** AI recaps, chapter summaries and chapter chats (kept local to the device). */
  aiData: boolean;
};

export const DEFAULT_BACKUP_OPTIONS: BackupOptions = {
  library: true,
  settings: true,
  plugins: true,
  downloadedFiles: true,
  aiData: true,
};

export const resolveBackupOptions = (
  options?: Partial<BackupOptions>,
): BackupOptions => {
  const resolved = {
    ...DEFAULT_BACKUP_OPTIONS,
    ...options,
  };

  return {
    ...resolved,
    downloadedFiles: resolved.library && resolved.downloadedFiles,
    aiData: resolved.library && resolved.aiData,
  };
};

export const hasSelectedBackupOption = (options: BackupOptions) =>
  Object.values(options).some(Boolean);

export const areAllBackupOptionsSelected = (options: BackupOptions) =>
  Object.values(options).every(Boolean);
