#!/usr/bin/env node

// Dynamic import required: package.json has "type": "module" (ESM), require() is not available
import('../dist/index.cjs').catch((err) => {
  console.error('Failed to start coursera-mcp:', err.message);
  process.exit(1);
});
