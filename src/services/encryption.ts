import crypto from 'crypto';
import { logger } from '../utils/logger';

export class EncryptionService {
  private masterKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits / 8
  private readonly ivLength = 16; // 128 bits / 8
  private readonly saltLength = 16; // 128 bits / 8
  private readonly iterations = 100000; // PBKDF2 iterations
  private readonly digest = 'sha256';

  constructor(masterPassword: string) {
    // Note: In production, derive from a more secure source (e.g., env variable)
    // For now, we derive from the provided password
    this.masterKey = this.deriveKey(masterPassword);
  }

  private deriveKey(password: string): Buffer {
    // Generate a consistent salt from the password for key derivation
    // In production, store salt with encrypted data or use a secure vault
    const salt = crypto.createHash('sha256').update('coursera-mcp-salt').digest();

    return crypto.pbkdf2Sync(password, salt, this.iterations, this.keyLength, this.digest);
  }

  encrypt(plaintext: string): string {
    try {
      // Generate a random IV for each encryption
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine IV + authTag + encrypted data
      const ciphertext = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]).toString(
        'base64'
      );

      logger.debug('Data encrypted', { length: plaintext.length });
      return ciphertext;
    } catch (error) {
      logger.error('Encryption failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  decrypt(ciphertext: string): string {
    try {
      // Decode base64
      const buffer = Buffer.from(ciphertext, 'base64');

      // Extract IV (first 16 bytes)
      const iv = buffer.subarray(0, this.ivLength);

      // Extract authTag (next 16 bytes)
      const authTag = buffer.subarray(this.ivLength, this.ivLength + 16);

      // Extract encrypted data (remaining bytes)
      const encrypted = buffer.subarray(this.ivLength + 16);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug('Data decrypted', { length: encrypted.length });
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
