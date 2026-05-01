# Claude Desktop Setup Guide

This guide explains how to integrate Coursera MCP with Claude Desktop.

## Prerequisites

- Claude Desktop (latest version)
- Coursera MCP installed: `npm install -g coursera-mcp`
- Coursera account with 2FA enabled (optional but recommended)

## Installation Steps

### 1. Install Coursera MCP

```bash
npm install -g coursera-mcp
```

Verify installation:

```bash
coursera-mcp --version
# Output: 0.1.0
```

### 2. Authenticate (Optional)

For private tools (enrolled courses, progress, recommendations):

```bash
coursera-mcp init
```

This sets up TOTP 2FA. You can skip this if you only want to use public tools.

### 3. Configure Claude Desktop

Find Claude's configuration file:

**macOS/Linux:**
```bash
~/.claude/claude.json
```

**Windows:**
```bash
%APPDATA%\Claude\claude.json
```

If the file doesn't exist, create it.

### 4. Add MCP Server Configuration

Add the Coursera MCP server to your Claude configuration:

```json
{
  "mcpServers": {
    "coursera": {
      "command": "coursera-mcp",
      "disabled": false
    }
  }
}
```

**Full example with multiple servers:**

```json
{
  "mcpServers": {
    "coursera": {
      "command": "coursera-mcp",
      "disabled": false
    },
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "/Users/yourname"],
      "disabled": false
    }
  }
}
```

### 5. Restart Claude Desktop

1. Close Claude Desktop completely
2. Reopen Claude Desktop
3. Tools should now be available

## Verification

In a Claude conversation:

### Check available tools

```
What tools do you have available?
```

You should see:
- `search_courses`
- `search_programs`
- `get_course_details`
- `get_program_details`
- `get_enrolled_courses` (if authenticated)
- `get_progress` (if authenticated)
- `get_recommendations` (if authenticated)

### Test a public tool

```
Find beginner Python courses
```

Claude should use `search_courses` to find results.

### Test private tools (if authenticated)

```
What courses am I enrolled in?
```

Claude should use `get_enrolled_courses` if you've authenticated.

## Usage Examples

### Search for Courses

> "Find machine learning specializations"

Claude will call `search_programs` with your query.

### Get Course Details

> "Tell me more about the Python for Everybody course"

Claude will call `get_course_details` with the course ID.

### Check Your Progress

> "How far along am I in the Data Science specialization?"

Claude will call `get_progress` (requires authentication).

### Get Recommendations

> "What courses would you recommend for me?"

Claude will call `get_recommendations` (requires authentication).

## Troubleshooting

### Tools not appearing

1. **Verify installation:**
   ```bash
   which coursera-mcp
   coursera-mcp --version
   ```

2. **Check configuration:**
   - Verify `~/.claude/claude.json` is valid JSON
   - Ensure `coursera-mcp` command is in PATH

3. **Restart Claude:**
   - Close Claude Desktop completely
   - Wait 5 seconds
   - Reopen Claude Desktop

### "Command not found" error

**Solution:** Install globally or use full path:

```json
{
  "mcpServers": {
    "coursera": {
      "command": "/usr/local/bin/coursera-mcp"
    }
  }
}
```

Find the full path:
```bash
which coursera-mcp
# Output: /usr/local/bin/coursera-mcp
```

### Authentication errors

If you get "No active session" errors:

```bash
coursera-mcp init
```

Then restart Claude Desktop.

### Connection timeout

If tools are timing out:

1. Check internet connection
2. Verify Coursera API is up (https://www.coursera.org)
3. Check if circuit breaker is open (wait 60 seconds)
4. Restart Claude Desktop

## Configuration Options

### Disable Temporarily

To disable Coursera MCP without removing config:

```json
{
  "mcpServers": {
    "coursera": {
      "command": "coursera-mcp",
      "disabled": true
    }
  }
}
```

Then restart Claude.

### Add Environment Variables (if needed)

```json
{
  "mcpServers": {
    "coursera": {
      "command": "coursera-mcp",
      "env": {
        "LOG_LEVEL": "debug",
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Advanced Usage

### Using in Conversations

Claude can now use Coursera tools automatically:

```
Claude: "I'll search for Python courses for you."
[Uses search_courses tool]

Claude: "I found 1,250 Python courses. Here are the top-rated ones:
- Python for Everybody (Rating: 4.8)
- Python Programming Basics (Rating: 4.7)
..."
```

### Chaining Tool Calls

Claude can chain multiple tool calls:

```
You: "Show me the details of the most popular Python course"

Claude: 
1. Calls search_courses('Python', {sortBy: 'enrollments'})
2. Gets top result ID
3. Calls get_course_details(topResultId)
4. Presents full course information
```

### Context-Aware Responses

If authenticated, Claude provides personalized responses:

```
You: "What should I learn next?"

Claude:
1. Calls get_enrolled_courses()
2. Calls get_recommendations()
3. Recommends based on your current courses

Result: "Based on your current enrollment in Python Basics 
and Data Science 101, I recommend Advanced Machine Learning..."
```

## Uninstallation

To remove Coursera MCP:

1. **Remove from Claude config:**
   - Edit `~/.claude/claude.json`
   - Remove the `coursera` entry from `mcpServers`

2. **Uninstall package (optional):**
   ```bash
   npm uninstall -g coursera-mcp
   ```

3. **Remove local data (optional):**
   ```bash
   rm -rf ~/.coursera-mcp/
   ```

## Updates

To update to the latest version:

```bash
npm install -g coursera-mcp@latest
```

No configuration changes needed. Claude will automatically use the new version.

## Support

- 📖 [API Documentation](API.md)
- 🐛 [Report Issues](https://github.com/yourusername/coursera-mcp/issues)
- 💬 [Discussions](https://github.com/yourusername/coursera-mcp/discussions)

---

**Enjoy learning with Claude and Coursera MCP!** 🎓
