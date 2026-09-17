import { pool } from './pool.js'

/** Quick connectivity check: prints server version + table list. */
async function main() {
  const [v] = await pool.query('SELECT VERSION() AS version')
  console.log('MySQL OK — version:', v[0].version)
  const [tables] = await pool.query(
    "SELECT TABLE_NAME AS t FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY 1"
  )
  console.log('tables:', tables.map((r) => r.t).join(', ') || '(none yet — run npm run migrate)')
  await pool.end()
}

main().catch((e) => { console.error('DB CONNECTION FAILED:', e.message); process.exit(1) })
