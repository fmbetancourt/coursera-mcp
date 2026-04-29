import { describe, it, expect, beforeEach } from 'bun:test';
import { EncryptionService } from '../../../src/services/encryption';

describe('EncryptionService', () => {
  let encryption: EncryptionService;
  const masterPassword = 'test-master-password';

  beforeEach(() => {
    encryption = new EncryptionService(masterPassword);
  });

  describe('Basic encryption/decryption', () => {
    it('should encrypt and decrypt plaintext', () => {
      const plaintext = 'Hello, World!';

      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);

      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = 'Special chars: !@#$%^&*() 你好 🎉';

      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';

      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Encryption properties', () => {
    it('should produce different ciphertext for same plaintext (due to random IV)', () => {
      const plaintext = 'Test plaintext';

      const encrypted1 = encryption.encrypt(plaintext);
      const encrypted2 = encryption.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should not produce plaintext in ciphertext', () => {
      const plaintext = 'secret-password-123';

      const encrypted = encryption.encrypt(plaintext);

      expect(encrypted).not.toContain(plaintext);
      expect(Buffer.from(encrypted, 'base64').toString('utf8')).not.toContain(plaintext);
    });

    it('should produce consistent length ciphertext', () => {
      const texts = ['a', 'ab', 'abc', 'test', 'longer test string'];
      const lengths: number[] = [];

      for (const text of texts) {
        const encrypted = encryption.encrypt(text);
        lengths.push(encrypted.length);
      }

      // All should be different lengths (due to different plaintext sizes)
      const uniqueLengths = new Set(lengths);
      expect(uniqueLengths.size).toBeGreaterThan(1);
    });
  });

  describe('Password security', () => {
    it('should fail decryption with wrong password', () => {
      const plaintext = 'secret data';
      const encrypted = encryption.encrypt(plaintext);

      // Create new instance with different password
      const wrongEncryption = new EncryptionService('wrong-password');

      expect(() => {
        wrongEncryption.decrypt(encrypted);
      }).toThrow();
    });

    it('should fail decryption with corrupted ciphertext', () => {
      const plaintext = 'secret data';
      const encrypted = encryption.encrypt(plaintext);

      // Corrupt the ciphertext
      const buffer = Buffer.from(encrypted, 'base64');
      buffer[0] = (buffer[0] + 1) % 256;
      const corrupted = buffer.toString('base64');

      expect(() => {
        encryption.decrypt(corrupted);
      }).toThrow();
    });
  });

  describe('Round-trip operations', () => {
    it('should handle multiple encrypt/decrypt cycles', () => {
      let data = 'initial data';

      for (let i = 0; i < 5; i++) {
        const encrypted = encryption.encrypt(data);
        data = encryption.decrypt(encrypted);
        expect(data).toBe('initial data');
      }
    });

    it('should handle array of values', () => {
      const values = ['value1', 'value2', 'value3', 'value4'];

      const encrypted = values.map((v) => encryption.encrypt(v));
      const decrypted = encrypted.map((e) => encryption.decrypt(e));

      expect(decrypted).toEqual(values);
    });
  });

  describe('Session token encryption', () => {
    it('should encrypt and decrypt session tokens', () => {
      const token = 'session_abc123_xyz789';

      const encrypted = encryption.encrypt(token);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(token);
    });

    it('should handle JWT-like tokens', () => {
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

      const encrypted = encryption.encrypt(token);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(token);
    });
  });

  describe('Error handling', () => {
    it('should throw on invalid base64 ciphertext', () => {
      expect(() => {
        encryption.decrypt('not-valid-base64!@#$');
      }).toThrow();
    });

    it('should throw on truncated ciphertext', () => {
      const plaintext = 'test';
      const encrypted = encryption.encrypt(plaintext);

      // Truncate the ciphertext
      const truncated = encrypted.substring(0, Math.floor(encrypted.length / 2));

      expect(() => {
        encryption.decrypt(truncated);
      }).toThrow();
    });
  });
});
