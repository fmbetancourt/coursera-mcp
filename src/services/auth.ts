import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger';
import { CourseraClient } from './courseraClient';

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

  constructor(
    courseraClient: CourseraClient,
    sessionsPath = path.join(process.env.HOME || '~', '.coursera-mcp', 'sessions.json')
  ) {
    this.courseraClient = courseraClient;
    this.sessionsPath = sessionsPath;
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
}
