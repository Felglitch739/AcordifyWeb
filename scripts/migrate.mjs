import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function loadEnvValue(key) {
  if (process.env[key]) {
    return process.env[key];
  }

  for (const filename of ['.env', '.env.local']) {
    const filePath = path.join(rootDir, filename);
    if (!fs.existsSync(filePath)) continue;

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const k = trimmed.slice(0, eqIdx).trim();
      if (k !== key) continue;
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      return val;
    }
  }
  return undefined;
}

async function runMigration() {
  const connectionString = loadEnvValue('DATABASE_URL_UNPOOLED') || loadEnvValue('DATABASE_URL');
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL_UNPOOLED / DATABASE_URL in environment or .env.local');
  }

  const schemaSql = fs.readFileSync(path.join(rootDir, 'db', 'schema.sql'), 'utf8');
  const client = new pg.Client({ connectionString });

  await client.connect();
  try {
    await client.query(schemaSql);
    const check = await client.query(
      "SELECT to_regclass('public.saved_progressions') AS table_name",
    );
    const tableName = check.rows[0]?.table_name;
    if (!tableName) {
      throw new Error('Migration ran but saved_progressions table was not found');
    }
    console.log(`Migration verified: table "${tableName}" is ready.`);
  } finally {
    await client.end();
  }
}

runMigration().catch((err) => {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
