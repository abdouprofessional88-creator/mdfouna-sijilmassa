import { useEffect, useState } from 'react'

/**
 * Shows a slim banner when the backend API is unreachable (e.g. GitHub Pages
 * showcase build). Dismissible, remembered for the session.
 */
export default function DemoBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('ms_hide_demo') === '1') return
    let live = true
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    fetch('/api/health', { signal: ctrl.signal })
      .then((r) => {
        if (live && !r.ok) setShow(true)
      })
      .catch(() => live && setShow(true))
      .finally(() => clearTimeout(t))
    return () => { live = false }
  }, [])

  if (!show) return null
  return (
    <div className="demo-banner" role="status">
      <span>👁️ نسخة عرض — المينيو يعمل محلياً، والدخول والطلبات والحجوزات تتطلب تشغيل السيرفر.</span>
      <button onClick={() => { sessionStorage.setItem('ms_hide_demo', '1'); setShow(false) }} aria-label="إخفاء التنبيه">
        ✕
      </button>
    </div>
  )
}
