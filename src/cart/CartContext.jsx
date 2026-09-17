import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * Ephemeral cart state (in-memory only — MySQL is the order database,
 * localStorage is NOT used). Shared across the whole website.
 * Line: { key, productId, name, latin, image, basePrice, qty, options:[{groupId, group, optionId, label_ar, price_delta}], note }
 */
const CartContext = createContext(null)

const lineTotal = (l) => (l.basePrice + l.options.reduce((a, o) => a + (Number(o.price_delta) || 0), 0)) * l.qty

export function CartProvider({ children }) {
  const [lines, setLines] = useState([])
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [fees, setFees] = useState({ delivery_fee_mad: 20, free_delivery_over_mad: 200 })

  const add = useCallback((line) => {
    const key = `${line.productId}|${line.options.map((o) => `${o.groupId}:${o.optionId}`).sort().join(',')}|${line.note || ''}`
    setLines((prev) => {
      const i = prev.findIndex((l) => l.key === key)
      if (i >= 0) {
        const next = [...prev]
        next[i] = { ...next[i], qty: Math.min(20, next[i].qty + line.qty) }
        return next
      }
      return [...prev, { ...line, key, qty: Math.min(20, line.qty) }]
    })
    setToast({ name: line.name, at: Date.now() })
  }, [])

  const setQty = useCallback((key, qty) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, qty: Math.min(20, qty) } : l))
    )
  }, [])

  const remove = useCallback((key) => setLines((prev) => prev.filter((l) => l.key !== key)), [])
  const clear = useCallback(() => setLines([]), [])

  const subtotal = useMemo(() => lines.reduce((a, l) => a + lineTotal(l), 0), [lines])
  const count = useMemo(() => lines.reduce((a, l) => a + l.qty, 0), [lines])
  const feeFor = useCallback((type) => {
    if (type !== 'delivery' || lines.length === 0) return 0
    if (fees.free_delivery_over_mad > 0 && subtotal >= fees.free_delivery_over_mad) return 0
    return fees.delivery_fee_mad
  }, [fees, subtotal, lines.length])

  return (
    <CartContext.Provider value={{
      lines, add, setQty, remove, clear, subtotal, count, feeFor,
      open, setOpen, toast, setToast, fees, setFees, lineTotal,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
