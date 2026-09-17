import 'dotenv/config'

function required(name, fallback) {
  const v = process.env[name] ?? fallback
  if (v === undefined || v === '') throw new Error(`Missing required env var: ${name} (see server/.env.example)`)
  return v
}

/** Supports either DATABASE_URL (mysql://user:pass@host:port/db) or split vars. */
function dbConfig() {
  if (process.env.DATABASE_URL) {
    const u = new URL(process.env.DATABASE_URL)
    return {
      host: u.hostname,
      port: Number(u.port) || 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
    }
  }
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: process.env.DB_NAME || 'sijilmassa_db',
  }
}

export const env = {
  port: Number(process.env.PORT || 4000),
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()),
  db: dbConfig(),
  dbRoot: {
    user: process.env.DB_ROOT_USER || 'root',
    password: process.env.DB_ROOT_PASSWORD || '',
  },
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  authCookie: process.env.AUTH_COOKIE || 'sijilmassa_token',
  isProd: process.env.NODE_ENV === 'production',
}
