# Coursera MCP Security Guide for Users

This guide explains how to securely set up and use Coursera MCP with TOTP 2FA authentication.

## Table of Contents

- [2FA Setup](#2fa-setup)
- [Credential Storage](#credential-storage)
- [Changing Your Password](#changing-your-password)
- [Backup Codes](#backup-codes)
- [Session Management](#session-management)
- [Reporting Security Issues](#reporting-security-issues)

## 2FA Setup

Coursera MCP uses **Time-based One-Time Password (TOTP)** authentication for enhanced security. This is the same technology used by Google Authenticator, Authy, 1Password, and Microsoft Authenticator.

### Step 1: Start Setup

```bash
coursera-mcp init
```

### Step 2: Enter Your Email

```
Enter your Coursera email: your.email@example.com
```

### Step 3: Enter Your Password (Temporary)

```
Enter your Coursera password: •••••••••••
```

⚠️ **Important:** Your password is only used during setup and is **never stored**.

### Step 4: Scan QR Code

A QR code will be displayed:

```
Scan this QR code with your authenticator app:

█████████████████████████████
█ ▄▄▄▄▄ █  ▀█▀  ▀█▀ █ ▄▄▄▄▄ █
█ █   █ █ ▀█▀▀▀█▀█▀ █ █   █ █
█ █▄▄▄█ █  █▀▀▀ ▀▀▀ █ █▄▄▄█ █
█▄▄▄▄▄▄▄█ ▄▀▄ ▄▀▄ ▄ █▄▄▄▄▄▄▄█
█ ▀ ▀▀▀▀▀  ▀▀▀▀▀  ▀ ▀▀█ ▀ ▀▀█
█████████████████████████████

Manual entry code (if camera unavailable):
JBSWY3DPEHPK3PXP
```

### Step 5: Choose Your Authenticator App

Pick any of these trusted apps:

- **Google Authenticator** (iOS, Android)
  - Free, open source
  - No account required
  - Works offline

- **Microsoft Authenticator** (iOS, Android)
  - Free from Microsoft
  - Phone sign-in support
  - Passwordless option

- **Authy** (iOS, Android, Mac, Windows)
  - Multi-device sync
  - Cloud backup (optional)
  - Custom icons

- **1Password** (iOS, Android, Mac, Windows)
  - Integrated password manager
  - Cloud sync
  - Paid but comprehensive

- **FreeOTP** (iOS, Android)
  - Free, open source
  - No cloud sync
  - Privacy-focused

### Step 6: Add to Your App

In your chosen authenticator app:

1. Tap "+" or "Add Account"
2. Choose "Scan a QR code" (or "Manual entry" if camera unavailable)
3. Scan the QR code from Step 4
4. You'll see: **Coursera MCP** | **6-digit code** (changes every 30s)

### Step 7: Verify Code

The CLI will prompt:

```
Enter 6-digit code from your authenticator: 123456
```

Enter the current 6-digit code from your authenticator app.

### Step 8: Save Backup Codes

You'll receive 10 backup codes:

```
Save these backup codes in a safe place:
1. ABC123DEF456GHI789
2. JKL012MNO345PQR678
3. STU901VWX234YZA567
... (7 more)
```

📌 **Save these immediately!** You'll need one if you:
- Lose access to your authenticator app
- Get a new phone
- Have your phone stolen

### Step 9: Complete

```
✓ Setup complete! Your session is now secure.
Authenticated as: your.email@example.com
Session expires in: 24 hours
```

## Credential Storage

### What's Stored

Your session token (not your password or authenticator secret) is stored in:

```
~/.coursera-mcp/sessions.json
```

Example file (redacted):

```json
{
  "your.email@example.com": {
    "sessionToken": "[encrypted-token-here]",
    "refreshToken": "[encrypted-refresh-token]",
    "expiresAt": 1746123456789,
    "lastRefreshed": 1746037056789,
    "totpEnabled": true
  }
}
```

### How It's Protected

- **Encryption:** AES-256-GCM (same as banking)
- **Key Derivation:** PBKDF2 with 100,000 iterations
- **File Permissions:** Read/write for owner only (chmod 0o600)
- **No backups:** Only accessible on this machine

### What's NOT Stored

❌ Your Coursera password  
❌ Your authenticator secret  
❌ Your 2FA codes  
❌ Your email  
❌ Any personal data  

## Changing Your Password

### Update Coursera Password (Web)

1. Go to [Coursera Account Settings](https://www.coursera.org/account-settings)
2. Click "Sign In & Security"
3. Change your password
4. Log out of all devices

**Your MCP session will continue to work** (uses session token, not password).

### Update 2FA Secret

If you want to use a different authenticator app or device:

1. **Generate new secret:**

```bash
coursera-mcp init
```

2. **Answer "Yes"** when asked to set up 2FA again

3. **Old authenticator app will stop working** - scan the new QR code

4. **Delete old entry** from your authenticator app

## Backup Codes

### What Are They?

One-time codes that work if you lose your authenticator app.

### How to Use

If you lose access to your authenticator:

```bash
coursera-mcp init

# When prompted for 6-digit code:
Enter 6-digit code from your authenticator (or backup code): ABC123DEF456
```

Enter one backup code instead of a 6-digit code.

⚠️ **Each backup code can only be used once.**

### Store Safely

Save your backup codes in ONE of these:

✅ **Password Manager:**
- 1Password
- Bitwarden
- LastPass
- KeePass

✅ **Physical Safe:**
- Home safe
- Bank safety deposit box
- Fireproof box

✅ **Trusted Person:**
- Family member
- Close friend
- Kept separate from device

❌ **NOT in:**
- Plain text email
- Cloud storage (Google Drive, Dropbox)
- Same device as authenticator
- GitHub gists or public places

### Generate New Codes

If you've used some or lost yours:

```bash
coursera-mcp backup-codes
```

This generates 10 new codes and saves them. **Old codes become invalid.**

## Session Management

### Current Session

Check your active session:

```bash
coursera-mcp status

# Output:
# Status: ✓ Authenticated
# Email: your.email@example.com
# Session expires in: 23 hours, 45 minutes
```

### Sessions Across Devices

Each device has its own session:

- **Laptop A:** Session 1 (expires in 24h)
- **Laptop B:** Session 2 (expires in 24h)
- **Desktop:** Session 3 (expires in 24h)

**Each is separate and independent.**

### Auto-Refresh

Your session automatically refreshes when:

- You make a request with <5 minutes left
- Coursera API is available
- Automatic (you don't need to do anything)

If auto-refresh fails, you'll be logged out:

```bash
coursera-mcp init  # Re-authenticate
```

### Manual Logout

```bash
coursera-mcp logout
```

This deletes your local session. You can set up again later:

```bash
coursera-mcp init
```

### Session Expiration

Sessions expire after **24 hours** of the last refresh.

If your session expires:

```
Error: No active session. Please authenticate first.
> coursera-mcp init
```

## Privacy & Data

### What Data Is Collected?

Coursera MCP collects:
- ✅ Your Coursera course/program data (for tools)
- ✅ Tool usage logs (for debugging)

Coursera MCP **does NOT** collect:
- ❌ Your password
- ❌ Your email address
- ❌ Browser history
- ❌ Personal files or data
- ❌ Biometric information

### Logs

Logs are stored locally:

```
~/.coursera-mcp/
├── combined.log          # All logs
└── error.log             # Errors only
```

**Sensitive data is automatically redacted:**

```javascript
// Example: Before logging
{
  sessionToken: "secret-token-123",
  email: "user@example.com"
}

// Logged as
{
  sessionToken: "[REDACTED]",
  email: "[REDACTED]"
}
```

### Data Deletion

To delete all local data:

```bash
rm -rf ~/.coursera-mcp/
```

This removes:
- Session tokens
- Cached course data
- All logs

## Reporting Security Issues

Found a vulnerability? **Please don't report it publicly.**

### Responsible Disclosure

1. **Email:** security@coursera-mcp.dev (or your security contact)
2. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Your contact information

3. **Expect:**
   - Response within 48 hours
   - Regular updates on fix status
   - Credit in release notes (if desired)

### Bug Bounty

While we don't have a formal bug bounty program, we greatly appreciate security researchers who report issues responsibly.

## Security Best Practices

### ✅ Do

- ✅ Use a unique, strong Coursera password
- ✅ Enable 2FA in your Coursera account (in addition to MCP)
- ✅ Keep your authenticator app on a trusted device
- ✅ Back up your codes in a secure location
- ✅ Keep your machine's OS and software updated
- ✅ Review session permissions regularly
- ✅ Use a password manager

### ❌ Don't

- ❌ Share your authenticator secret with anyone
- ❌ Take screenshots of QR codes or codes
- ❌ Store backup codes in plain email or cloud storage
- ❌ Use the same password as other services
- ❌ Run MCP with elevated privileges (sudo)
- ❌ Commit `.coursera-mcp/` to git
- ❌ Post your session token online

## Frequently Asked Questions

### Q: What if I lose my phone?

**A:** Use a backup code:

```bash
coursera-mcp init
# Enter backup code when prompted for 6-digit code
```

Then generate new backup codes on your new phone.

### Q: Can I use the same authenticator on multiple devices?

**A:** Yes! Sync options:

- **Authy:** Cloud sync (recommended)
- **Microsoft Authenticator:** Phone sync
- **1Password:** Full sync
- **Google Authenticator:** Manual re-scan on each device

### Q: What if I never set up backup codes?

**A:** Generate them now:

```bash
coursera-mcp backup-codes
```

### Q: How do I switch authenticator apps?

**A:** Re-run setup:

```bash
coursera-mcp init
# Choose "Yes" when asked to set up 2FA
# Scan new QR code in new authenticator app
```

### Q: Is my data safe on my computer?

**A:** Your session token is:
- ✅ Encrypted with AES-256
- ✅ Protected with strict file permissions
- ✅ Only accessible by your user account
- ✅ Not sent anywhere automatically

But your computer's security matters:
- Keep OS updated
- Use antivirus software
- Don't install untrusted software
- Keep your account password secure

### Q: Can I access my session from multiple computers?

**A:** No, each computer needs its own setup:

```bash
# Computer A
coursera-mcp init

# Computer B (separate setup)
coursera-mcp init
```

Each computer maintains its own encrypted session.

## Need Help?

- 📖 Full docs: [https://github.com/fmbetancourt/coursera-mcp](https://github.com/fmbetancourt/coursera-mcp)
- 🐛 Report bugs: [GitHub Issues](https://github.com/fmbetancourt/coursera-mcp/issues)
- 💬 Ask questions: [GitHub Discussions](https://github.com/fmbetancourt/coursera-mcp/discussions)

---

**Last Updated:** May 1, 2026  
**Version:** 0.1.0
