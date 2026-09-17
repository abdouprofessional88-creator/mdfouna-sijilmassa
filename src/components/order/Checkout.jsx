import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useCart } from '../../cart/CartContext.jsx'
import { api } from '../../api/client.js'
import MapPicker from '../map/MapPicker.jsx'

const LABEL_AR = { home: 'الدار', work: 'العمل', other: 'أخرى' }

const pollOrder = async (id, tries = 12) => {
  for (let i = 0; i < tries; i++) {
    await new Promise((r) => setTimeout(r, 1200))
    try {
      const { order } = await api.orderDetail(id)
      if (order.status === 'received' && order.payment_status === 'paid') return order
      if (['cancelled', 'rejected'].includes(order.status)) throw new Error('أُلغي الطلب.')
    } catch (e) {
      if (e.message === 'أُلغي الطلب.') throw e
    }
  }
  throw new Error('لم يصل تأكيد الدفع بعد — تحقق من طلباتي بعد قليل.')
}

export function CheckoutView({ onDone, onLogin }) {
  const { user } = useAuth()
  const { lines, subtotal, feeFor, clear } = useCart()
  const [type, setType] = useState('delivery')
  const [form, setForm] = useState({
    full_name: user?.full_name || '', phone: user?.phone || '',
    special_instructions: '',
  })
  const [pay, setPay] = useState('cash')
  const [payCfg, setPayCfg] = useState({ cash: true, card: true })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [bank, setBank] = useState(null) // { order, payment, provider } while card payment pending
  const [bankBusy, setBankBusy] = useState(false)

  // delivery address state (GPS/map — never auto-requested)
  const [saved, setSaved] = useState([])
  const [addrMode, setAddrMode] = useState('saved') // saved | new
  const [savedId, setSavedId] = useState(null)
  const [point, setPoint] = useState(null) // {lat,lng,accuracy,formatted,parts,geocodeFailed}
  const [manualAddr, setManualAddr] = useState('')
  const [notes, setNotes] = useState('')
  const [saveNew, setSaveNew] = useState(false)
  const [saveLabel, setSaveLabel] = useState('home')
  const [quote, setQuote] = useState({ state: 'idle' })
  const [restPos, setRestPos] = useState(null)

  useEffect(() => {
    if (!user) return
    api.addresses().then((d) => {
      setSaved(d.addresses)
      const def = d.addresses.find((a) => a.is_default)
      if (def) { setSavedId(def.id); setAddrMode('saved') }
      else if (d.addresses.length === 0) setAddrMode('new')
    }).catch(() => setAddrMode('new'))
    api.menu().then((d) => {
      if (d.fees) {
        if (Number.isFinite(Number(d.fees.restaurant_lat))) {
          setRestPos({ lat: Number(d.fees.restaurant_lat), lng: Number(d.fees.restaurant_lng) })
        }
        setPayCfg({ cash: d.fees.cash_on_delivery !== false, card: d.fees.card_enabled !== false })
        if (d.fees.cash_on_delivery === false) setPay('card')
      }
    }).catch(() => {})
  }, [user])

  // server-side quote whenever the delivery point changes
  useEffect(() => {
    if (type !== 'delivery') return
    const coords = addrMode === 'saved'
      ? (() => { const s = saved.find((a) => a.id === savedId); return s ? { lat: Number(s.latitude), lng: Number(s.longitude) } : null })()
      : (point ? { lat: point.lat, lng: point.lng } : null)
    if (!coords) { setQuote({ state: 'idle' }); return }
    let live = true
    setQuote({ state: 'loading' })
    api.deliveryQuote({ latitude: coords.lat, longitude: coords.lng, subtotal })
      .then((q) => live && setQuote({ state: 'done', ...q }))
      .catch((e) => live && setQuote({ state: 'outside', msg: e.message }))
    return () => { live = false }
  }, [type, addrMode, savedId, saved, point, subtotal])

  if (!user) {
    return (
      <section className="section"><div className="container auth__wrap">
        <div className="auth__card" style={{ textAlign: 'center' }}>
          <h2 className="h2">إتمام الطلب</h2>
          <p className="lead" style={{ margin: '10px auto 20px' }}>سجّل الدخول أولاً لتأكيد طلبك وتتبعه لاحقاً.</p>
          <button className="btn btn-primary" onClick={onLogin}>تسجيل الدخول</button>
        </div>
      </div></section>
    )
  }

  if (lines.length === 0) {
    return (
      <section className="section"><div className="container auth__wrap">
        <div className="auth__card" style={{ textAlign: 'center' }}>
          <h2 className="h2">السلة فارغة</h2>
          <p className="lead" style={{ margin: '10px auto 20px' }}>أضف أطباقاً من المينيو أولاً.</p>
        </div>
      </div></section>
    )
  }

  const fee = type === 'delivery'
    ? (quote.state === 'done' ? quote.fee : feeFor(type))
    : 0
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      let address_id = null
      let latitude = null
      let longitude = null
      let address_line = ''
      let city = 'مكناس'
      if (type === 'delivery') {
        if (addrMode === 'saved') {
          const s = saved.find((a) => a.id === savedId)
          if (!s) throw new Error('اختر عنواناً محفوظاً أو حدد نقطة جديدة على الخريطة.')
          address_id = s.id
          address_line = s.formatted_address
          city = s.city || 'مكناس'
        } else {
          if (!point) throw new Error('حدد نقطة التوصيل على الخريطة أولاً.')
          const manual = point.geocodeFailed ? manualAddr.trim() : ''
          if (point.geocodeFailed && manual.length < 5) {
            throw new Error('أضف وصفاً قصيراً للعنوان (5 أحرف على الأقل).')
          }
          latitude = point.lat
          longitude = point.lng
          address_line = point.formatted || manual || `GPS: ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`
          city = point.parts?.city || 'مكناس'
          if (saveNew) {
            const savedAddr = await api.saveAddress({
              label: saveLabel, formatted_address: address_line,
              street: point.parts?.street || '', neighborhood: point.parts?.neighborhood || '',
              city, postal_code: point.parts?.postal_code || '', country: point.parts?.country || 'المغرب',
              latitude: point.lat, longitude: point.lng, accuracy_m: point.accuracy,
              delivery_notes: notes.trim(), is_default: saved.length === 0,
            })
            address_id = savedAddr.address.id
            latitude = null
            longitude = null
          }
        }
        if (quote.state === 'outside') throw new Error(quote.msg || 'العنوان خارج نطاق التوصيل.')
      }
      const payload = {
        order_type: type, payment_method: pay,
        full_name: form.full_name, phone: form.phone,
        address_line: type === 'delivery' ? address_line : '',
        city, special_instructions: form.special_instructions,
        address_id, latitude, longitude,
        delivery_notes: notes.trim(),
        items: lines.map((l) => ({
          menu_item_id: Number(String(l.productId).replace(/^db-/, '')) || l.productId,
          quantity: l.qty,
          options: Object.fromEntries(
            l.options.reduce((acc, o) => {
              const k = String(o.groupId)
              const group = acc.find((x) => x[0] === k)
              if (group) group[1].push(o.optionId)
              else acc.push([k, [o.optionId]])
              return acc
            }, [])
          ),
          item_note: l.note || '',
        })),
      }
      const { order } = await api.createOrder(payload)
      if (pay === 'cash') {
        // server creates the cash intent + moves to received (verified response only)
        await api.createPayment({ order_id: order.id, method: 'cash' })
        const fresh = await api.orderDetail(order.id)
        clear()
        onDone(fresh.order)
        return
      }
      // card → server intent, then the (simulated) bank page confirms via webhook
      const intent = await api.createPayment({ order_id: order.id, method: 'card' })
      clear()
      setBusy(false)
      setBank({ order, payment: intent.payment, provider: intent.provider })
      return
    } catch (err) {
      setError(err.details ? Object.values(err.details).flat().join('، ') : err.message)
    } finally {
      setBusy(false)
    }
  }

  const bankConfirm = async (outcome) => {
    if (!bank) return
    setBankBusy(true)
    setError('')
    try {
      await api.mockConfirmPayment({ provider_payment_id: bank.payment.provider_payment_id, outcome })
      if (outcome !== 'paid') {
        setBank(null)
        setError('أُلغي الدفع — يمكنك المحاولة مجدداً أو اختيار الدفع نقداً.')
        return
      }
      // success screen ONLY after the server confirms verified paid status
      const verified = await pollOrder(bank.order.id)
      onDone(verified)
    } catch (err) {
      setError(err.message)
      setBank(null)
    } finally {
      setBankBusy(false)
    }
  }

  if (bank) {
    return (
      <section className="section"><div className="container auth__wrap">
        <div className="auth__card" style={{ textAlign: 'center' }}>
          <span className="kicker">الدفع بالبطاقة — {bank.provider === 'mock_dev' ? 'صفحة بنكية تجريبية' : bank.provider}</span>
          <h2 className="h2" style={{ margin: '10px 0' }}>{bank.order.total} درهم</h2>
          <p className="lead" style={{ margin: '0 auto 6px', fontSize: 14 }}>
            طلب <strong dir="ltr">{bank.order.order_number}</strong> بانتظار الدفع.
            لا يُحتسب الدفع إلا بعد تأكيد البنك والتحقق في السيرفر.
          </p>
          {bank.provider === 'mock_dev' && (
            <p className="demo-pill" style={{ margin: '10px auto' }}>وضع تطوير — محاكاة بنكية، ليست عملية حقيقية</p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 18 }}>
            <button className="btn btn-primary" disabled={bankBusy} onClick={() => bankConfirm('paid')}>
              {bankBusy ? 'جاري التحقق…' : 'ادفع الآن (محاكاة)'}
            </button>
            <button className="btn btn-outline" disabled={bankBusy} onClick={() => bankConfirm('cancelled')}>
              إلغاء الدفع
            </button>
          </div>
        </div>
      </div></section>
    )
  }

  return (
    <section className="section">
      <div className="container checkout">
        <span className="kicker">إتمام الطلب</span>
        <h2 className="h2" style={{ margin: '10px 0 20px' }}>خطوة أخيرة ويصلك طلبك 🛵</h2>
        {error && <p className="auth__err" role="alert">{error}</p>}
        <form onSubmit={submit} noValidate>
          <div className="checkout__grid">
            <div>
              <div className="checkout__block">
                <h3>1 · الاستلام</h3>
                <div className="auth__tabs">
                  {[{ id: 'delivery', ar: 'توصيل 🛵' }, { id: 'pickup', ar: 'استلام من المطعم 🏠' }].map((t) => (
                    <button type="button" key={t.id} className={type === t.id ? 'is-on' : ''} onClick={() => setType(t.id)}>
                      {t.ar}
                    </button>
                  ))}
                </div>
                {type === 'pickup' && (
                  <p className="dash__muted">تستلم طلبك من: Lot 431، الرياض الإسماعيلية، مكناس — سنتصل بك عند الجاهزية. (DEMO)</p>
                )}
              </div>

              {type === 'delivery' && (
                <div className="checkout__block">
                  <h3>2 · عنوان التوصيل (GPS)</h3>
                  <p className="dash__muted">نحتاج موقعك فقط لحساب التوصيل وإيصال طلبك — لا يُحفظ إلا إذا حفظته أو أكدت الطلب.</p>
                  {saved.length > 0 && (
                    <div className="addr-saved">
                      {saved.map((a) => (
                        <label key={a.id} className={addrMode === 'saved' && savedId === a.id ? 'is-on' : ''}>
                          <input type="radio" name="addr" checked={addrMode === 'saved' && savedId === a.id}
                            onChange={() => { setAddrMode('saved'); setSavedId(a.id) }} />
                          <span><strong>{LABEL_AR[a.label] || a.label}</strong> — {a.formatted_address}</span>
                        </label>
                      ))}
                      <label className={addrMode === 'new' ? 'is-on' : ''}>
                        <input type="radio" name="addr" checked={addrMode === 'new'} onChange={() => setAddrMode('new')} />
                        <span><strong>📍 نقطة جديدة على الخريطة</strong></span>
                      </label>
                    </div>
                  )}
                  {(addrMode === 'new' || saved.length === 0) && (
                    <>
                      <MapPicker restaurant={restPos} onSelect={setPoint} />
                      {point?.geocodeFailed && (
                        <label>وصف العنوان (إجباري هنا)
                          <input className="auth__input" value={manualAddr} onChange={(e) => setManualAddr(e.target.value)}
                            placeholder="مثال: زنقة 12، عمارة النور، قرب الفرن…" />
                        </label>
                      )}
                      <label>تعليمات التوصيل (اختياري)
                        <input className="auth__input" value={notes} onChange={(e) => setNotes(e.target.value)}
                          placeholder="مثال: الدار الصفراء على اليسار…" maxLength={255} />
                      </label>
                      {saved.length >= 0 && (
                        <label className="addr-save">
                          <input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} />
                          <span>احفظ هذا العنوان لـ {saveLabel === 'home' ? 'الدار' : saveLabel === 'work' ? 'العمل' : 'أخرى'}: </span>
                          <select value={saveLabel} onChange={(e) => setSaveLabel(e.target.value)} aria-label="تصنيف العنوان">
                            <option value="home">الدار</option>
                            <option value="work">العمل</option>
                            <option value="other">أخرى</option>
                          </select>
                        </label>
                      )}
                    </>
                  )}
                  {quote.state === 'loading' && <p className="dash__muted">جاري حساب التوصيل من السيرفر…</p>}
                  {quote.state === 'done' && (
                    <p className={quote.zone === 'review' ? 'auth__field-err' : 'quote-ok'}>
                      {quote.zone === 'review'
                        ? `⚠ على حدود التوصيل (${quote.distanceKm} كم) — سيُراجعه الطاقم. التوصيل: ${quote.fee} درهم.`
                        : `✓ داخل نطاق التوصيل (${quote.distanceKm} كم) — التوصيل: ${quote.free ? 'مجاني 🎉' : `${quote.fee} درهم`}.`}
                    </p>
                  )}
                  {quote.state === 'outside' && <p className="auth__err" role="alert">{quote.msg}</p>}
                </div>
              )}

              <div className="checkout__block">
                <h3>{type === 'delivery' ? '3 · معلوماتك' : '2 · معلوماتك'}</h3>
                <div className="auth__grid">
                  <label>الاسم الكامل<input className="auth__input" value={form.full_name} onChange={set('full_name')} required /></label>
                  <label>الهاتف<input className="auth__input" value={form.phone} onChange={set('phone')} dir="ltr" required /></label>
                </div>
                <label>تعليمات خاصة<input className="auth__input" value={form.special_instructions} onChange={set('special_instructions')} placeholder="اختياري…" maxLength={500} /></label>
              </div>

              <div className="checkout__block">
                <h3>{type === 'delivery' ? '4 · الدفع' : '3 · الدفع'}</h3>
                <div className="pay__grid">
                  {payCfg.cash && (
                    <button type="button" className={`pay ${pay === 'cash' ? 'is-on' : ''}`} onClick={() => setPay('cash')}>
                      <strong>الدفع عند الاستلام</strong>
                      <small>نقداً عند التوصيل أو الاستلام</small>
                    </button>
                  )}
                  {payCfg.card && (
                    <button type="button" className={`pay is-demo ${pay === 'card' ? 'is-on' : ''}`} onClick={() => setPay('card')}>
                      <strong>البطاقة البنكية</strong>
                      <small>عبر بوابة الدفع — يُحتسب بعد تأكيد البنك فقط</small>
                    </button>
                  )}
                  {!payCfg.cash && !payCfg.card && (
                    <p className="auth__err">الدفع معطّل حالياً — اتصل بالمطعم.</p>
                  )}
                </div>
              </div>
            </div>

            <aside className="checkout__summary">
              <h3>ملخص الطلب</h3>
              <ul>
                {lines.map((l) => (
                  <li key={l.key}>
                    <span>{l.qty} × {l.name}{l.options.length > 0 && <small> ({l.options.map((o) => o.label_ar).join('، ')})</small>}</span>
                    <strong>{(l.basePrice + l.options.reduce((a, o) => a + Number(o.price_delta || 0), 0)) * l.qty} درهم</strong>
                  </li>
                ))}
              </ul>
              <div className="drawer__row"><span>المجموع الفرعي</span><strong>{subtotal} درهم</strong></div>
              <div className="drawer__row"><span>التوصيل{quote.state === 'done' ? ` (${quote.distanceKm} كم)` : ''}</span><strong>{fee === 0 ? 'مجاني' : `${fee} درهم`}</strong></div>
              <div className="drawer__row total"><span>المجموع</span><strong>{subtotal + fee} درهم</strong></div>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy || (type === 'delivery' && quote.state === 'outside')}>
                {busy ? 'جاري إرسال الطلب…' : `تأكيد الطلب · ${subtotal + fee} درهم`}
              </button>
              <p className="drawer__fine">السعر النهائي يُعاد حسابه في السيرفر عند التأكيد.</p>
            </aside>
          </div>
        </form>
      </div>
    </section>
  )
}

export function OrderSuccessView({ order, onTrack, onHome }) {
  if (!order) return null
  return (
    <section className="section">
      <div className="container auth__wrap">
        <div className="auth__card" style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 56 }} aria-hidden="true">🎉</span>
          <h2 className="h2" style={{ marginTop: 8 }}>
            {order.payment_status === 'paid' ? 'تم تأكيد الدفع بنجاح' : 'شكراً! طلبك وصلنا'}
          </h2>
          <p className="lead" style={{ margin: '10px auto' }}>
            رقم الطلب: <strong dir="ltr">{order.order_number}</strong><br />
            المجموع: <strong>{order.total} درهم</strong> · الحالة: <strong>قيد المراجعة</strong><br />
            {order.payment_status === 'paid'
              ? 'طلبك دخل مرحلة المعالجة — سنتصل بك قريباً.'
              : order.order_type === 'delivery' ? 'سنتصل بك للتأكيد قبل الانطلاق.' : 'سنتصل بك عند جاهزية طلبك للاستلام.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 18 }}>
            <button className="btn btn-primary" onClick={onTrack}>تتبع طلباتي</button>
            <button className="btn btn-outline" onClick={onHome}>عودة للرئيسية</button>
          </div>
        </div>
      </div>
    </section>
  )
}
