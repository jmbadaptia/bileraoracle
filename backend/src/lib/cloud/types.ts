export interface CloudFile {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedAt: Date;
  isFolder: boolean;
  thumbnailUrl?: string;
  webViewUrl?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
}

export interface RefreshedToken {
  accessToken: string;
  expiresAt: Date;
}

export interface DownloadedFile {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export interface CloudProvider {
  getAuthUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<TokenPair>;
  refreshAccessToken(refreshToken: string): Promise<RefreshedToken>;
  listFiles(accessToken: string, folderId?: string): Promise<CloudFile[]>;
  downloadFile(accessToken: string, file: CloudFile): Promise<DownloadedFile>;
}
