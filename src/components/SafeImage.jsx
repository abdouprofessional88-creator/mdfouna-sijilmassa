import { useState } from 'react'
import { img } from '../config/images.js'

/**
 * Image with a 3-stage automatic chain:
 *   1. The restaurant's REAL photo  (/images/real/*.jpg) — appears automatically
 *      the moment the owner drops the file in, no code changes needed.
 *   2. A real professional stock photo (remote URL).
 *   3. The local SVG illustration (always works offline).
 */
export default function SafeImage({ src, real, fallback, alt, ...rest }) {
  const [stage, setStage] = useState(0)
  const chain = [real ? img(real) : null, src, img(fallback)].filter(Boolean)
  return (
    <img
      src={chain[Math.min(stage, chain.length - 1)]}
      alt={alt}
      decoding="async"
      onError={() => setStage((s) => Math.min(s + 1, chain.length - 1))}
      {...rest}
    />
  )
}
