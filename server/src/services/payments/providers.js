import crypto from 'node:crypto'

/**
 * Payment provider abstraction.
 * ─────────────────────────────
 * Selected provider: PAYMENT_PROVIDER env.
 * - `mock_dev` (default): local development simulator. Implements the REAL
 *   architecture (server intent → HMAC-signed webhook → idempotent apply),
 *   but the "bank page" is simulated. NEVER for production.
 * - `stripe`: real Stripe integration point (requires STRIPE_SECRET_KEY +
 *   STRIPE_WEBHOOK_SECRET). Honest assessment: Stripe does NOT onboard
 *   Moroccan businesses directly — the owner likely needs CMI instead.
 * - `cmi`: real CMI (Centre Monétique Interbancaire) integration point —
 *   the correct gateway for Morocco, requires a merchant contract +
 *   CMI_* credentials from the bank. Implement `createIntent`/`parseWebhook`
 *   per CMI docs when credentials exist.
 *
 * Interface every provider must implement:
 * - createIntent({ orderId, orderNumber, amount, currency }) → { provider_payment_id, action }
 * - signEvent(payload) → signature (for mock/webhook simulation)
 * - parseWebhook({ rawBody, signature }) → { eventId, paymentId, outcome: 'paid'|'failed'|'cancelled', amount }
 */

const PROVIDER = process.env.PAYMENT_PROVIDER || 'mock_dev'
const CURRENCY = process.env.PAYMENT_CURRENCY || 'MAD'

function hmac(data) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET || 'dev-webhook-secret-change-me'
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

const mockDev = {
  name: 'mock_dev',
  async createIntent({ orderId, orderNumber, amount }) {
    const pid = `mock_${orderNumber}_${Date.now().toString(36)}`
    return {
      provider_payment_id: pid,
      action: { type: 'mock_bank_page', message: 'صفحة بنكية تجريبية (وضع التطوير فقط)' },
    }
  },
  signEvent(eventObj) {
    const body = JSON.stringify(eventObj)
    return { body, signature: hmac(body) }
  },
  parseWebhook({ rawBody, signature }) {
    const expected = hmac(rawBody)
    const a = Buffer.from(signature || '', 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw Object.assign(new Error('توقيع webhook غير صالح'), { status: 401 })
    }
    const e = JSON.parse(rawBody)
    if (!e.event_id || !e.payment_id || !['paid', 'failed', 'cancelled'].includes(e.outcome)) {
      throw Object.assign(new Error('حدث دفع غير صالح'), { status: 422 })
    }
    return { eventId: e.event_id, paymentId: e.payment_id, outcome: e.outcome, amount: Number(e.amount) || 0 }
  },
  async refund() {
    return { ok: true, provider_refund_id: `mock_ref_${Date.now().toString(36)}` }
  },
}

function notConfigured(name) {
  return {
    name,
    async createIntent() {
      throw Object.assign(
        new Error(`بوابة ${name} غير مفعّلة — زوّد مفاتيحها في متغيرات البيئة (راجع server/.env.example)`),
        { status: 503 }
      )
    },
    parseWebhook() {
      throw Object.assign(new Error('webhook غير مفعّل لهذه البوابة'), { status: 503 })
    },
    async refund() {
      throw Object.assign(new Error('الاسترجاع غير مفعّل لهذه البوابة'), { status: 503 })
    },
  }
}

export const provider = PROVIDER === 'mock_dev' ? mockDev : notConfigured(PROVIDER)
export const providerName = () => provider.name
export const paymentCurrency = () => CURRENCY
export const isMockProvider = () => provider.name === 'mock_dev'

/** Cash availability + card availability (manager-controlled settings). */
export async function paymentConfig(query) {
  const rows = await query("SELECT `key`, `value` FROM settings WHERE `key` IN ('cash_on_delivery','card_enabled')")
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return {
    cash: s.cash_on_delivery !== '0',
    card: s.card_enabled !== '0',
    provider: provider.name,
    mock: isMockProvider(),
  }
}
