#!/usr/bin/env node
/**
 * CivicFix Database Engine Switcher
 * Dynamically selects schema.prisma (SQLite) or schema.postgresql.prisma (PostgreSQL)
 * based on DATABASE_URL without modifying or destroying local development data.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables if .env exists
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const dotenv = require('dotenv');
  dotenv.config({ path: envPath });
}

const dbUrl = (process.env.DATABASE_URL || '').trim();
const isPostgres =
  dbUrl.startsWith('postgresql://') ||
  dbUrl.startsWith('postgres://') ||
  process.env.PRISMA_SCHEMA === 'postgresql';

const schemaFile = isPostgres
  ? path.resolve(__dirname, '../prisma/schema.postgresql.prisma')
  : path.resolve(__dirname, '../prisma/schema.prisma');

const action = process.argv[2] || 'generate';

console.log(`[CivicFix DB] Database provider: ${isPostgres ? 'PostgreSQL (Production)' : 'SQLite (Local Dev)'}`);
console.log(`[CivicFix DB] Target schema: ${path.basename(schemaFile)}`);

let prismaArgs = [];

switch (action) {
  case 'generate':
    prismaArgs = ['prisma', 'generate', `--schema=${schemaFile}`];
    break;
  case 'push':
    prismaArgs = ['prisma', 'db', 'push', `--schema=${schemaFile}`];
    break;
  case 'migrate':
    prismaArgs = ['prisma', 'migrate', 'deploy', `--schema=${schemaFile}`];
    break;
  case 'validate':
    prismaArgs = ['prisma', 'validate', `--schema=${schemaFile}`];
    break;
  default:
    prismaArgs = ['prisma', action, `--schema=${schemaFile}`, ...process.argv.slice(3)];
    break;
}

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const result = spawnSync(npxCmd, prismaArgs, {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
});

process.exit(result.status || 0);
