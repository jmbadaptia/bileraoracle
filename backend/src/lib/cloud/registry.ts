import { CloudProvider } from "./types.js";
import { GoogleDriveProvider } from "./google-drive.js";

const providers: Record<string, () => CloudProvider> = {
  GOOGLE_DRIVE: () => new GoogleDriveProvider(),
  // ONEDRIVE: () => new OneDriveProvider(),
  // DROPBOX: () => new DropboxProvider(),
};

export function getCloudProvider(name: string): CloudProvider {
  const factory = providers[name];
  if (!factory) throw new Error(`Proveedor cloud no soportado: ${name}`);
  return factory();
}

export function isValidProvider(name: string): boolean {
  return name in providers;
}
