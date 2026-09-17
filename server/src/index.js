import { createApp } from './app.js'
import { env } from './config/env.js'
import { pool } from './db/pool.js'

async function main() {
  try {
    await pool.query('SELECT 1')
    console.log('MySQL connected.')
  } catch (e) {
    console.error('Cannot reach MySQL:', e.message)
    console.error('Check server/.env then: npm run test:db')
    process.exit(1)
  }
  createApp().listen(env.port, () => {
    console.log(`sijilmassa-api listening on http://localhost:${env.port}`);
  })
}

main()
