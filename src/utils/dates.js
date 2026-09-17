/** Date helpers — API returns MySQL DATE (YYYY-MM-DD) or ISO strings. */
export const toDayKey = (d) => String(d || '').slice(0, 10)

export const todayKey = () => {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

export const fmtDay = (d) =>
  new Date(`${toDayKey(d)}T00:00:00`).toLocaleDateString('ar-MA', { dateStyle: 'long' })

export const fmtTime = (t) => String(t || '').slice(0, 5)
