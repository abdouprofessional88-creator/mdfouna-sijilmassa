import { useEffect } from 'react'

/**
 * Attaches IntersectionObserver to all `.reveal` elements.
 * Re-scans whenever `deps` change (view switches remount sections).
 * Respects prefers-reduced-motion.
 */
export function useReveal(deps = []) {
  useEffect(() => {
    const els = [...document.querySelectorAll('.reveal:not(.is-visible)')]
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('is-visible'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
