import crypto from 'crypto'
import { config } from '../../config/config';

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(config.encryptionKey!, "hex");
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

if (!config.encryptionKey || Buffer.from(config.encryptionKey, "hex").length !== 32) {
  throw new Error("ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("hex");
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "hex");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}