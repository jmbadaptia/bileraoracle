import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.CLOUD_TOKEN_SECRET;
  if (!secret || secret.length !== 64) {
    throw new Error(
      "CLOUD_TOKEN_SECRET must be a 64-character hex string (32 bytes)"
    );
  }
  return Buffer.from(secret, "hex");
}

/** Encrypts a string. Returns a self-contained string: iv.ciphertext.authTag (all base64) */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  return iv.toString("base64") + "." + encrypted + "." + authTag;
}

/** Decrypts a self-contained encrypted string (iv.ciphertext.authTag) */
export function decryptToken(encrypted: string): string {
  const key = getKey();
  const [ivB64, ciphertext, authTagB64] = encrypted.split(".");
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivB64, "base64"),
    { authTagLength: AUTH_TAG_LENGTH }
  );
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));

  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
