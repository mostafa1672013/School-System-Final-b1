// Set test key BEFORE imports that use it
process.env.NATIONAL_ID_ENCRYPTION_KEY = 'a'.repeat(64);

import { encryptNationalId, decryptNationalId, hashNationalId } from '../lib/crypto';

describe('nationalId encryption', () => {
  it('round-trips correctly', () => {
    const original = '29901012345678';
    expect(decryptNationalId(encryptNationalId(original))).toBe(original);
  });

  it('produces different ciphertext each time (random IV)', () => {
    const id = '29901012345678';
    expect(encryptNationalId(id)).not.toBe(encryptNationalId(id));
  });

  it('hash is deterministic', () => {
    const id = '29901012345678';
    expect(hashNationalId(id)).toBe(hashNationalId(id));
  });

  it('different IDs produce different hashes', () => {
    expect(hashNationalId('11111111111111')).not.toBe(hashNationalId('22222222222222'));
  });

  it('decryptNationalId returns plaintext as-is (migration safety)', () => {
    // Plain text without ':' should pass through unchanged
    expect(decryptNationalId('29901012345678')).toBe('29901012345678');
  });

  it('decryption fails on tampered ciphertext', () => {
    const encrypted = encryptNationalId('29901012345678');
    // Tamper with the last 4 chars of ciphertext portion
    const parts = encrypted.split(':');
    parts[2] = parts[2].slice(0, -4) + '0000';
    expect(() => decryptNationalId(parts.join(':'))).toThrow();
  });
});
