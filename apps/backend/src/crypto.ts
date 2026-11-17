import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { HttpError } from './lib';

// AES-256-GCM encryption for values that must be stored but never shown in plain text,
// currently bank account numbers. The key comes from PAYMENT_ENCRYPTION_KEY: 32 random bytes,
// base64 encoded. Create one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
//
// Stored format:  v1:<iv>:<auth tag>:<ciphertext>   (each part base64)
// The "v1" prefix lets a future key or algorithm change be told apart from old values.
// Every value gets its own random IV, and GCM's auth tag makes any tampering detectable.

function loadKey(): Buffer {
  const raw = process.env.PAYMENT_ENCRYPTION_KEY?.trim();
  const key = raw ? Buffer.from(raw, 'base64') : null;
  if (!key || key.length !== 32) {
    console.error('PAYMENT_ENCRYPTION_KEY is missing or is not 32 bytes of base64. Bank accounts cannot be saved.');
    throw new HttpError(503, 'Saving bank accounts is not available right now. Please try again later.');
  }
  return key;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', loadKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

export function decryptSecret(token: string): string {
  const [version, iv, tag, data] = token.split(':');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unsupported encrypted value');
  const decipher = createDecipheriv('aes-256-gcm', loadKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}
