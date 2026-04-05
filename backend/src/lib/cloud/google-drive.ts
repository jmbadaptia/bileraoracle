import { google } from "googleapis";
import {
  CloudProvider,
  CloudFile,
  TokenPair,
  RefreshedToken,
  DownloadedFile,
} from "./types.js";

// Google Workspace MIME types that need export (not direct download)
const EXPORT_MAP: Record<string, string> = {
  "application/vnd.google-apps.document": "application/pdf",
  "application/vnd.google-apps.spreadsheet": "application/pdf",
  "application/vnd.google-apps.presentation": "application/pdf",
  "application/vnd.google-apps.drawing": "application/pdf",
};

export class GoogleDriveProvider implements CloudProvider {
  private get clientId() {
    return process.env.GOOGLE_CLIENT_ID || "";
  }
  private get clientSecret() {
    return process.env.GOOGLE_CLIENT_SECRET || "";
  }

  private createOAuth2(redirectUri: string) {
    return new google.auth.OAuth2(this.clientId, this.clientSecret, redirectUri);
  }

  getAuthUrl(state: string, redirectUri: string): string {
    const oauth2 = this.createOAuth2(redirectUri);
    return oauth2.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      state,
    });
  }

  async exchangeCode(code: string, redirectUri: string): Promise<TokenPair> {
    const oauth2 = this.createOAuth2(redirectUri);
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
    const userInfo = await oauth2Api.userinfo.get();

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiresAt: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
      email: userInfo.data.email || "",
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<RefreshedToken> {
    const oauth2 = this.createOAuth2("");
    oauth2.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2.refreshAccessToken();
    return {
      accessToken: credentials.access_token!,
      expiresAt: new Date(
        credentials.expiry_date || Date.now() + 3600 * 1000
      ),
    };
  }

  async listFiles(accessToken: string, folderId?: string): Promise<CloudFile[]> {
    const oauth2 = this.createOAuth2("");
    oauth2.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2 });

    const parentId = folderId || "root";
    const res = await drive.files.list({
      q: `'${parentId}' in parents and trashed = false`,
      fields:
        "files(id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink)",
      orderBy: "folder,name",
      pageSize: 200,
    });

    return (res.data.files || []).map((f) => ({
      id: f.id!,
      name: f.name!,
      mimeType: f.mimeType!,
      size: f.size ? parseInt(f.size, 10) : null,
      modifiedAt: new Date(f.modifiedTime!),
      isFolder: f.mimeType === "application/vnd.google-apps.folder",
      thumbnailUrl: f.thumbnailLink || undefined,
      webViewUrl: f.webViewLink || undefined,
    }));
  }

  async downloadFile(
    accessToken: string,
    file: CloudFile
  ): Promise<DownloadedFile> {
    const oauth2 = this.createOAuth2("");
    oauth2.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2 });

    const exportMimeType = EXPORT_MAP[file.mimeType];

    if (exportMimeType) {
      // Google Workspace file — export as PDF
      const res = await drive.files.export(
        { fileId: file.id, mimeType: exportMimeType },
        { responseType: "arraybuffer" }
      );
      const baseName = file.name.replace(/\.[^.]+$/, "") || file.name;
      return {
        buffer: Buffer.from(res.data as ArrayBuffer),
        mimeType: exportMimeType,
        fileName: `${baseName}.pdf`,
      };
    }

    // Regular file — direct download
    const res = await drive.files.get(
      { fileId: file.id, alt: "media" },
      { responseType: "arraybuffer" }
    );
    return {
      buffer: Buffer.from(res.data as ArrayBuffer),
      mimeType: file.mimeType,
      fileName: file.name,
    };
  }
}
