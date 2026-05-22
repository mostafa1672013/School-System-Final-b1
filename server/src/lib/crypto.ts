import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const keyHex = process.env.NATIONAL_ID_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('NATIONAL_ID_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
}

// Returns format: iv_hex:authTag_hex:ciphertext_hex
export function encryptNationalId(plaintext: string): string {
  const key    = getKey();
  const iv     = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag   = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptNationalId(stored: string): string {
  // If not encrypted format (no colons), return as-is (migration safety)
  if (!stored.includes(':')) return stored;

  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted nationalId format');
  const [ivHex, authTagHex, encryptedHex] = parts;

  const key       = getKey();
  const iv        = Buffer.from(ivHex, 'hex');
  const authTag   = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher  = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

// Deterministic HMAC-SHA256 for @unique lookup
export function hashNationalId(plaintext: string): string {
  const key = getKey();
  return createHmac('sha256', key).update(plaintext).digest('hex');
}
