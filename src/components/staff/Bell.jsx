import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../api/client.js'

/** In-app notifications: polling fallback (25s, only when tab visible). */
let interacted = false
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => { interacted = true }, { once: true })
}

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    o.frequency.value = 880
    g.gain.setValueAtTime(0.08, ctx.currentTime)
    o.start()
    o.stop(ctx.currentTime + 0.25)
    setTimeout(() => ctx.close(), 400)
  } catch {}
}

export default function Bell() {
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [sound, setSound] = useState(false)
  const seenRef = useRef(0)

  const load = useCallback(async (notify = true) => {
    try {
      const d = await api.notifications()
      setItems(d.notifications)
      setUnread(d.unread)
      if (notify && d.unread > seenRef.current && seenRef.current !== 0) {
        if (sound && interacted) beep()
      }
      seenRef.current = d.unread
    } catch {}
  }, [sound])

  useEffect(() => {
    load(false)
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') load(true)
    }, 25000)
    return () => clearInterval(t)
  }, [load])

  const markAll = async () => {
    await api.readAllNotifications().catch(() => {})
    setUnread(0)
    setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })))
  }

  return (
    <div className="bell">
      <button className="bell__btn" onClick={() => setOpen((v) => !v)} aria-label={`التنبيهات (${unread} غير مقروءة)`} aria-expanded={open}>
        🔔{unread > 0 && <b>{unread}</b>}
      </button>
      {open && (
        <div className="bell__panel" role="dialog" aria-label="التنبيهات">
          <div className="bell__head">
            <strong>التنبيهات</strong>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label className="bell__sound" title="صوت التنبيه">
                <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> صوت
              </label>
              <button onClick={markAll}>تعليم الكل مقروءاً</button>
            </div>
          </div>
          {items.length === 0 && <p className="dash__muted" style={{ padding: 12 }}>لا تنبيهات.</p>}
          {items.slice(0, 12).map((n) => (
            <div key={n.id} className={`bell__item ${n.is_read ? '' : 'new'}`}>
              <strong>{n.title}</strong>
              <p>{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
