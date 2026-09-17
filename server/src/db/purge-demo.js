import { query, pool } from './pool.js'

/** Remove all demo/seed accounts before production. Safe: never touches orders data. */
const DEMO_EMAILS = [
  'demo@sijilmassa.ma', 'admin@sijilmassa.ma', 'manager@sijilmassa.ma',
  'staff@sijilmassa.ma', 'reception@sijilmassa.ma', 'kitchen@sijilmassa.ma',
  'driver@sijilmassa.ma', 'customer@sijilmassa.ma',
]

async function main() {
  if (process.env.CONFIRM_PURGE !== 'yes') {
    console.error("Refusing: set CONFIRM_PURGE=yes to delete demo accounts (e.g. CONFIRM_PURGE=yes node src/db/purge-demo.js)")
    process.exit(1)
  }
  const r = await query('DELETE FROM users WHERE email IN (?)', [DEMO_EMAILS])
  console.log(`purged ${r.affectedRows} demo accounts (their reservations/orders cascade-deleted)`)
  await pool.end()
}

main().catch((e) => { console.error('PURGE FAILED:', e.message); process.exit(1) })
