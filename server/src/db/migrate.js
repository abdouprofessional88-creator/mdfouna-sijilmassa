import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { env } from '../config/env.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS = path.join(here, 'migrations')

/** Applies pending *.sql migrations in filename order. Idempotent. */
async function main() {
  const { db } = env
  // connect WITHOUT database first so the very first run works too
  const conn = await mysql.createConnection({ host: db.host, port: db.port, user: db.user, password: db.password })
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  } catch (e) {
    // limited app user cannot CREATE DATABASE — it must already exist (see create.js)
    if (e.code !== 'ER_DBACCESS_DENIED_ERROR' && e.code !== 'ER_ACCESS_DENIED_ERROR') throw e
  }
  await conn.query(`USE \`${db.database}\``)

  await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(64) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

  const [done] = await conn.query('SELECT version FROM schema_migrations')
  const applied = new Set(done.map((r) => r.version))
  const files = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()

  for (const file of files) {
    const version = path.basename(file, '.sql')
    if (applied.has(version)) { console.log(`skip ${version} (already applied)`); continue }
    const sql = fs.readFileSync(path.join(MIGRATIONS, file), 'utf8')
    // split on semicolons at line ends (simple, safe for our files)
    const statements = sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)
    for (const stmt of statements) await conn.query(stmt)
    await conn.query('INSERT INTO schema_migrations (version) VALUES (?)', [version])
    console.log(`applied ${version}`)
  }
  console.log('MIGRATE DONE')
  await conn.end()
}

main().catch((e) => { console.error('MIGRATE FAILED:', e.message); process.exit(1) })
