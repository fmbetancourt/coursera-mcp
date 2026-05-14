import readline from 'readline';
import { EnterpriseAuthService } from '../services/enterpriseAuth.js';
import path from 'path';

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

export async function runInitEnterpriseCLI(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });

  process.stderr.write('\n=== Coursera MCP — Enterprise Setup ===\n\n');
  process.stderr.write('This command connects the MCP to your Coursera for Business organization.\n');
  process.stderr.write('It enables three enterprise tools:\n');
  process.stderr.write('  - get_enterprise_programs  : Learning paths / programs in your org\n');
  process.stderr.write('  - get_enterprise_contents  : Catalog curated by your organization\n');
  process.stderr.write('  - get_enterprise_enrollments: Enrollment and progress reports\n\n');
  process.stderr.write('You need three values from your Coursera for Business admin:\n');
  process.stderr.write('  - Organization ID (orgId)\n');
  process.stderr.write('  - App Key (from the API credentials page)\n');
  process.stderr.write('  - App Secret (from the API credentials page)\n\n');

  const orgId = (await prompt(rl, 'Organization ID (orgId): ')).trim();
  if (!orgId) {
    process.stderr.write('Error: orgId cannot be empty.\n');
    rl.close();
    process.exit(1);
  }

  const appKey = (await prompt(rl, 'App Key: ')).trim();
  if (!appKey) {
    process.stderr.write('Error: App Key cannot be empty.\n');
    rl.close();
    process.exit(1);
  }

  const appSecret = (await prompt(rl, 'App Secret: ')).trim();
  if (!appSecret) {
    process.stderr.write('Error: App Secret cannot be empty.\n');
    rl.close();
    process.exit(1);
  }

  process.stderr.write('\nValidating credentials against Coursera Enterprise API...\n');

  const masterPassword = process.env.COURSERA_MASTER_PASSWORD ?? 'default-master-key';
  if (!process.env.COURSERA_MASTER_PASSWORD) {
    process.stderr.write(
      'Warning: COURSERA_MASTER_PASSWORD env var not set. Using default key.\n\n'
    );
  }

  const sessionPath = path.join(process.env.HOME ?? '~', '.coursera-mcp', 'enterprise.json');
  const enterpriseAuth = new EnterpriseAuthService(masterPassword, sessionPath);

  try {
    const { orgName } = await enterpriseAuth.validateAndSave(orgId, appKey, appSecret);

    process.stderr.write(`\n✓ Connected to organization: "${orgName}" (ID: ${orgId})\n`);
    process.stderr.write('✓ Enterprise credentials saved (encrypted).\n');
    process.stderr.write('  Enterprise tools are now enabled in Claude Desktop.\n\n');
    process.stderr.write('  Available tools:\n');
    process.stderr.write('    get_enterprise_programs\n');
    process.stderr.write('    get_enterprise_contents\n');
    process.stderr.write('    get_enterprise_enrollments\n\n');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`\nEnterprise setup failed: ${msg}\n`);
    process.stderr.write('Make sure your orgId, App Key, and App Secret are correct.\n\n');
    rl.close();
    process.exit(1);
  }

  rl.close();
}
