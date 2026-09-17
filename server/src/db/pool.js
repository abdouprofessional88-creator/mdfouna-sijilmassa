import mysql from 'mysql2/promise'
import { env } from '../config/env.js'

/** Shared MySQL connection pool (mysql2/promise). */
export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+01:00', // Morocco (WET/WEST) — adjust for DST as needed
  dateStrings: true, // DATE/TIME/DATETIME as 'YYYY-MM-DD' strings (no TZ-shift bugs)
})

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows
}
