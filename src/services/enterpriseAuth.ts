import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { logger } from '../utils/logger.js';
import { EncryptionService } from './encryption.js';

interface EnterpriseSession {
  orgId: string;
  appKey: string;       // encrypted
  appSecret: string;    // encrypted
  accessToken?: string; // encrypted, cached
  tokenExpiresAt?: number; // ms timestamp
}

export class EnterpriseAuthService {
  private session: EnterpriseSession | null = null;
  private readonly sessionPath: string;
  private readonly encryptionService: EncryptionService;

  static readonly TOKEN_URL = 'https://api.coursera.com/oauth2/client_credentials/token';
  static readonly BASE_URL = 'https://api.coursera.com/ent';

  constructor(
    masterPassword = 'default-master-key',
    sessionPath = path.join(process.env.HOME ?? '~', '.coursera-mcp', 'enterprise.json')
  ) {
    this.sessionPath = sessionPath;
    this.encryptionService = new EncryptionService(masterPassword);
    this.loadSession();
  }

  hasCredentials(): boolean {
    return this.session !== null;
  }

  getOrgId(): string {
    if (!this.session) throw new Error('No enterprise credentials configured. Run: coursera-mcp init-enterprise');
    return this.session.orgId;
  }

  async makeRequest<T>(url: string): Promise<T> {
    const token = await this.getAccessToken();
    const response = await axios.get<T>(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  async getAccessToken(): Promise<string> {
    if (!this.session) {
      throw new Error('No enterprise credentials configured. Run: coursera-mcp init-enterprise');
    }

    // Return cached token if still valid (60s buffer)
    const now = Date.now();
    if (this.session.accessToken && this.session.tokenExpiresAt && now < this.session.tokenExpiresAt - 60_000) {
      return this.encryptionService.decrypt(this.session.accessToken);
    }

    return this.refreshToken();
  }

  private async refreshToken(): Promise<string> {
    if (!this.session) throw new Error('No enterprise credentials');

    const appKey = this.encryptionService.decrypt(this.session.appKey);
    const appSecret = this.encryptionService.decrypt(this.session.appSecret);
    const basicCredentials = Buffer.from(`${appKey}:${appSecret}`).toString('base64');

    const response = await axios.post<{
      access_token: string;
      expires_in: number;
      issued_at: number;
    }>(
      EnterpriseAuthService.TOKEN_URL,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${basicCredentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, expires_in, issued_at } = response.data;
    const expiresAt = (issued_at + expires_in) * 1000;

    this.session.accessToken = this.encryptionService.encrypt(access_token);
    this.session.tokenExpiresAt = expiresAt;
    this.saveSession();

    logger.info('Enterprise token refreshed', { expiresAt: new Date(expiresAt).toISOString() });
    return access_token;
  }

  async validateAndSave(orgId: string, appKey: string, appSecret: string): Promise<{ orgName: string }> {
    const basicCredentials = Buffer.from(`${appKey}:${appSecret}`).toString('base64');

    const tokenRes = await axios.post<{ access_token: string; expires_in: number; issued_at: number }>(
      EnterpriseAuthService.TOKEN_URL,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${basicCredentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const token = tokenRes.data.access_token;

    const orgRes = await axios.get<{ elements?: Array<{ id: string; name: string }> }>(
      `${EnterpriseAuthService.BASE_URL}/api/businesses.v1/${orgId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const orgName = orgRes.data?.elements?.[0]?.name ?? orgId;

    this.session = {
      orgId,
      appKey: this.encryptionService.encrypt(appKey),
      appSecret: this.encryptionService.encrypt(appSecret),
      accessToken: this.encryptionService.encrypt(token),
      tokenExpiresAt: (tokenRes.data.issued_at + tokenRes.data.expires_in) * 1000,
    };
    this.saveSession();

    logger.info('Enterprise credentials saved', { orgId, orgName });
    return { orgName };
  }

  private loadSession(): void {
    try {
      if (fs.existsSync(this.sessionPath)) {
        this.session = fs.readJsonSync(this.sessionPath) as EnterpriseSession;
        logger.info('Enterprise session loaded', { orgId: this.session.orgId });
      }
    } catch (error) {
      logger.warn('Failed to load enterprise session', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private saveSession(): void {
    try {
      fs.ensureDirSync(path.dirname(this.sessionPath));
      fs.writeJsonSync(this.sessionPath, this.session, { mode: 0o600 });
    } catch (error) {
      logger.error('Failed to save enterprise session', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
