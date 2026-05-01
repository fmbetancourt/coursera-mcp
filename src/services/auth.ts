import fs from 'fs-extra';
import path from 'path';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { logger } from '../utils/logger';
import { CourseraClient } from './courseraClient';
import { EncryptionService } from './encryption';

export interface Session {
  email: string;
  sessionToken: string;
  refreshToken?: string;
  expiresAt: number;
  lastRefreshed: number;
  totpEnabled?: boolean;
}

export class AuthService {
  private courseraClient: CourseraClient;
  private sessionsPath: string;
  private sessions: Map<string, Session> = new Map();
  private encryptionService: EncryptionService;

  constructor(
    courseraClient: CourseraClient,
    masterPassword = 'default-master-key',
    sessionsPath = path.join(process.env.HOME || '~', '.coursera-mcp', 'sessions.json')
  ) {
    this.courseraClient = courseraClient;
    this.sessionsPath = sessionsPath;
    this.encryptionService = new EncryptionService(masterPassword);
    this.loadSessions();
  }

  initiateLogin(email: string, password: string): void {
    try {
      logger.info('Initiating login', { email });

      // This is a stub - actual implementation would call Coursera API
      // For now, just log the attempt
      logger.debug('Login stub called', { email, passwordLength: password.length });

      // In T1.22 (TOTP implementation), this will be extended
    } catch (error) {
      logger.error('Login initiation failed', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  loadSession(email: string): Session | null {
    const session = this.sessions.get(email);

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(email);
      this.saveSessions();
      logger.info('Session expired', { email });
      return null;
    }

    return session;
  }

  saveSession(email: string, session: Omit<Session, 'email'>): void {
    const fullSession: Session = {
      email,
      ...session,
    };

    this.sessions.set(email, fullSession);
    this.saveSessions();
    this.courseraClient.setSessionToken(session.sessionToken);

    logger.info('Session saved', {
      email,
      expiresIn: Math.round((session.expiresAt - Date.now()) / 1000),
    });
  }

  clearSession(email: string): void {
    this.sessions.delete(email);
    this.saveSessions();
    this.courseraClient.clearSessionToken();

    logger.info('Session cleared', { email });
  }

  getActiveSessions(): string[] {
    const now = Date.now();
    const active: string[] = [];

    for (const [email, session] of this.sessions.entries()) {
      if (now <= session.expiresAt) {
        active.push(email);
      }
    }

    return active;
  }

  private loadSessions(): void {
    try {
      if (fs.existsSync(this.sessionsPath)) {
        const data = fs.readJsonSync(this.sessionsPath) as Record<string, Session>;
        this.sessions = new Map(Object.entries(data));
        logger.info('Sessions loaded', { count: this.sessions.size });
      }
    } catch (error) {
      logger.warn('Failed to load sessions', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private saveSessions(): void {
    try {
      fs.ensureDirSync(path.dirname(this.sessionsPath));
      const data = Object.fromEntries(this.sessions);
      fs.writeJsonSync(this.sessionsPath, data, { mode: 0o600 });
    } catch (error) {
      logger.error('Failed to save sessions', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // TOTP 2FA Methods

  async generateTOTPSecret(email: string): Promise<{ secret: string; qrCode: string }> {
    try {
      const secret = speakeasy.generateSecret({
        name: `Coursera MCP (${email})`,
        issuer: 'Coursera MCP',
        length: 32,
      });

      if (!secret.otpauth_url) {
        throw new Error('Failed to generate TOTP secret');
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const qrCodeData = (await QRCode.toDataURL(secret.otpauth_url));

      logger.info('TOTP secret generated', { email });

      return {
        secret: String(secret.base32),
        qrCode: qrCodeData,
      };
    } catch (error) {
      logger.error('Failed to generate TOTP secret', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  validateTOTPCode(secret: string, code: string): boolean {
    try {
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 2, // Allow 2 time windows (±30 seconds)
      });

      return isValid;
    } catch (error) {
      logger.warn('TOTP validation error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  generateTOTPCode(secret: string): string {
    try {
      const code = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      return code;
    } catch (error) {
      logger.error('Failed to generate TOTP code', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  generateBackupCodes(count = 10): string[] {
    try {
      const codes: string[] = [];

      for (let i = 0; i < count; i++) {
        const code = `${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase()}`;
        codes.push(code);
      }

      logger.info('Backup codes generated', { count });

      return codes;
    } catch (error) {
      logger.error('Failed to generate backup codes', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Token Encryption Methods

  encryptSessionToken(token: string): string {
    return this.encryptionService.encrypt(token);
  }

  decryptSessionToken(encrypted: string): string {
    return this.encryptionService.decrypt(encrypted);
  }

  verifyTOTPAndCreateSession(email: string, totpSecret: string, totpCode: string): string {
    if (!this.validateTOTPCode(totpSecret, totpCode)) {
      logger.warn('TOTP verification failed', { email });
      throw new Error('Invalid TOTP code');
    }

    // Generate a mock session token (in production, get from API)
    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const encryptedToken = this.encryptSessionToken(sessionToken);

    // Save encrypted session
    this.saveSession(email, {
      sessionToken: encryptedToken,
      refreshToken: undefined,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      lastRefreshed: Date.now(),
      totpEnabled: true,
    });

    logger.info('Session created after TOTP verification', { email });

    return sessionToken;
  }

  refreshSession(email: string): void {
    const session = this.loadSession(email);

    if (!session) {
      throw new Error('No session found');
    }

    // Update expiration
    session.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    session.lastRefreshed = Date.now();

    this.sessions.set(email, session);
    this.saveSessions();

    logger.info('Session refreshed', { email });
  }

  isSessionExpiringSoon(email: string, minuteThreshold = 5): boolean {
    const session = this.loadSession(email);

    if (!session) {
      return false;
    }

    const now = Date.now();
    const expiresInMs = session.expiresAt - now;
    const thresholdMs = minuteThreshold * 60 * 1000;

    return expiresInMs > 0 && expiresInMs <= thresholdMs;
  }

  async refreshSessionWithAPI(email: string): Promise<void> {
    const session = this.loadSession(email);

    if (!session) {
      logger.error('Cannot refresh non-existent session', { email });
      throw new Error('No session found');
    }

    try {
      // Call API to get new token (mock endpoint for now)
      const response = await this.courseraClient.post<{ sessionToken: string }>(
        '/api/auth/refresh',
        { email, refreshToken: session.refreshToken }
      );

      if (!response?.sessionToken) {
        throw new Error('Invalid refresh response from API');
      }

      // Encrypt new token
      const encryptedToken = this.encryptSessionToken(response.sessionToken);

      // Update session
      session.sessionToken = encryptedToken;
      session.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      session.lastRefreshed = Date.now();

      this.sessions.set(email, session);
      this.saveSessions();
      this.courseraClient.setSessionToken(response.sessionToken);

      logger.info('Session refreshed with API', { email });
    } catch (error) {
      logger.error('Session refresh with API failed', {
        email,
        error: error instanceof Error ? error.message : String(error),
      });

      // Logout on refresh failure
      this.clearSession(email);

      throw new Error(
        `Session refresh failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
