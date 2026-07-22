import crypto from 'crypto'
import { config } from '../../config/config';

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_VERSION = "v1";

const KEY = Buffer.from(config.encryptionKey, "hex");

if (KEY.length !== 32) {
  throw new Error(`encryptionKey must be 32 bytes (64 hex chars) for AES-256-GCM, got ${KEY.length} bytes`);
}

/**
 * @param aad Additional Authenticated Data
 * auth tag fails to verify if it's wrong on decrypt. Without this, GCM only
 * proves the bytes weren't tampered with - not that this ciphertext belongs
 */
export function encrypt(plaintext: string, aad?: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  if (aad) cipher.setAAD(Buffer.from(aad, "utf8"));
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]).toString("hex");
  return `${KEY_VERSION}:${payload}`;
}

export function decrypt(ciphertext: string, aad?: string): string {
  const [version, payload] = ciphertext.includes(":")
    ? ciphertext.split(":", 2)
    : ["v1", ciphertext];

  if (version !== KEY_VERSION) {
    throw new Error(`Unsupported encryption key version: ${version}`);
  }

  const buf = Buffer.from(payload!, "hex");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  if (aad) decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}