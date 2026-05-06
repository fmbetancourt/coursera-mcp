import readline from 'readline';
import { CourseraClient } from '../services/courseraClient.js';
import { AuthService } from '../services/auth.js';
import path from 'path';

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

export async function runInitCLI(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });

  process.stderr.write('\n=== Coursera MCP — Authentication Setup ===\n\n');
  process.stderr.write('This command stores your Coursera session cookie (encrypted) so\n');
  process.stderr.write('private tools work: get_enrolled_courses, get_progress, get_recommendations.\n\n');

  process.stderr.write('Step 1: Log into https://www.coursera.org in your browser.\n');
  process.stderr.write('Step 2: Open DevTools (F12) → Application → Cookies → coursera.org\n');
  process.stderr.write('Step 3: Find the cookie named "CAUTH" and copy its value.\n\n');

  const cauthCookie = (await prompt(rl, 'Paste your CAUTH cookie value: ')).trim();

  if (!cauthCookie) {
    process.stderr.write('Error: CAUTH cookie value cannot be empty.\n');
    rl.close();
    process.exit(1);
  }

  process.stderr.write('\nValidating cookie against Coursera API...\n');

  const masterPassword = process.env.COURSERA_MASTER_PASSWORD ?? 'default-master-key';
  if (!process.env.COURSERA_MASTER_PASSWORD) {
    process.stderr.write(
      'Warning: COURSERA_MASTER_PASSWORD env var not set. Using default key.\n' +
      'For better security, set it in your shell profile and add it to your MCP server config.\n\n'
    );
  }

  const sessionsPath = path.join(process.env.HOME ?? '~', '.coursera-mcp', 'sessions.json');
  // Private Coursera consumer APIs live on www.coursera.org, not api.coursera.org
  const client = new CourseraClient('https://www.coursera.org');
  const authService = new AuthService(client, masterPassword, sessionsPath);

  try {
    const { userId, displayName } = await authService.validateCauthCookie(cauthCookie);

    process.stderr.write(`\nAuthenticated as: ${displayName} (ID: ${userId})\n`);

    authService.saveCauthSession(userId, cauthCookie);

    process.stderr.write('\n✓ Authentication successful! Session saved (expires in 30 days).\n');
    process.stderr.write('  Private tools are now enabled in Claude Desktop.\n\n');
    process.stderr.write('  If the session expires, run: coursera-mcp init\n\n');
  } catch (error) {
    process.stderr.write(
      `\nAuthentication failed: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.stderr.write('Make sure you copied the full CAUTH cookie value and are logged in.\n\n');
    rl.close();
    process.exit(1);
  }

  rl.close();
}
