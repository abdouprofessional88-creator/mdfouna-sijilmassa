import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { env } from '../config/env.js'

const here = path.dirname(fileURLToPath(import.meta.url))

/**
 * One-time database+user bootstrap using ROOT credentials.
 * Creates DB (utf8mb4) and the limited app user from .env.
 * Usage: node src/db/create.js   (needs DB_ROOT_* in server/.env)
 */
async function main() {
  const { dbRoot, db } = env
  const conn = await mysql.createConnection({
    host: db.host, port: db.port, user: dbRoot.user, password: dbRoot.password,
  })
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await conn.query(`CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?`, [db.user, db.password]).catch(async () => {
    // fallback for older syntax handling: build safely-quoted statement
    const esc = mysql.escape
    await conn.query(`CREATE USER IF NOT EXISTS ${esc(db.user)}@'%' IDENTIFIED BY ${esc(db.password)}`)
  })
  const esc = (v) => conn.escape(v)
  await conn.query(`GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON \`${db.database}\`.* TO ${esc(db.user)}@'%'`)
  await conn.query('FLUSH PRIVILEGES')
  console.log(`OK: database \`${db.database}\` + user '${db.user}' ready.`)
  console.log('Next: npm run migrate && npm run seed');
  await conn.end()
}

main().catch((e) => { console.error('CREATE FAILED:', e.message); process.exit(1) })
