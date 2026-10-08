'use client'

import { useEffect, useState } from 'react'

const GLYPHS = '!<>-_\\/[]{}=+*^?#:;'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

export const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
// The same glyph for the same n, for text rendered on the server as well as in the browser.
export const glyphAt = (n: number) => GLYPHS[n % GLYPHS.length]

// Faint dots where the text will appear, one to a letter, the spaces kept, so the words show in outline.
export function Placeholder({ text }: { text: string }) {
  return <span className="text-white/15">{text.replace(/\S/g, '·')}</span>
}

// Text that decodes out of flickering glyphs, left to right, `delay` ms after it mounts. Until then it is dots
// in the shape of the text; while decoding it is in the accent colour, or `decoding`. Mount it again to decode it
// again.
export function Decode({ text, delay = 0, decoding = 'text-accent' }: { text: string; delay?: number; decoding?: string }) {
  const [shown, setShown] = useState<string | null>(null)

  useEffect(() => {
    if (window.matchMedia(REDUCED_MOTION).matches) {
      setShown(text)
      return
    }
    const duration = 300 + text.length * 18
    let frame = 0
    const timer = window.setTimeout(() => {
      const start = performance.now()
      const tick = (now: number) => {
        const solved = Math.floor(((now - start) / duration) * text.length)
        if (solved >= text.length) {
          setShown(text)
          return
        }
        setShown([...text].map((c, i) => (i < solved || c === ' ' ? c : glyph())).join(''))
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, delay)
    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [text, delay])

  if (shown === null) return <Placeholder text={text} />
  return <span className={shown === text ? undefined : decoding}>{shown}</span>
}
