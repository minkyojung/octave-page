'use client'

import { useEffect, useRef, useState } from 'react'
import { useStep } from './StepContext'

// A faint field of drifting characters, the idea before it takes shape, densest low and towards the words it
// sits beside. Each time the headline moves on a step, a wave of the accent colour runs down through it, towards
// the window below, where the work happens.

const COLS = 34
const ROWS = 12
const FPS = 12
const RAMP = ' ·:;+*'
const PULSE_MS = 900
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5)

const clamp = (v: number) => Math.min(1, Math.max(0, v))

// The field at t seconds, as two layers of text: every character, and just those the wave is passing through
// (`wave` is how far down it is, from 0 to 1, or null when there is none).
export function field(t: number, wave: number | null): { base: string; glow: string } {
  const base: string[] = []
  const glow: string[] = []
  for (let r = 0; r < ROWS; r++) {
    let line = ''
    let lit = ''
    const y = (r + 0.5) / ROWS
    for (let c = 0; c < COLS; c++) {
      // x runs from the edge beside the words (0) out to the far edge (1).
      const x = (c + 0.5) / COLS
      // A cloud rising from the corner below and beside the words, rounded, thinning out to nothing at its edge.
      const d = Math.hypot(x / 0.95, (1 - y) / 0.95)
      const mound = Math.pow(clamp(1 - d), 0.9)
      const swirl = Math.sin(x * 7 + t * 0.5 + Math.sin(y * 5 - t * 0.35)) * Math.sin(y * 8 - t * 0.45 + x * 3)
      const level = clamp(mound * (0.75 + 0.5 * swirl)) * 0.85
      const step = Math.round(level * (RAMP.length - 1) + BAYER[(r & 3) * 4 + (c & 3)])
      const ch = RAMP[Math.min(RAMP.length - 1, Math.max(0, step))]
      line += ch
      lit += wave !== null && ch !== ' ' && Math.abs(y - wave) < 0.14 ? ch : ' '
    }
    base.push(line)
    glow.push(lit)
  }
  return { base: base.join('\n'), glow: glow.join('\n') }
}

// One field; `mirrored` turns it to face the other way, for the far side of the words.
export function IdeaField({ mirrored = false, className }: { mirrored?: boolean; className?: string }) {
  const { index } = useStep()
  const ref = useRef<HTMLDivElement>(null)
  // The first frame, the same on the server as in the browser, so the field is there before any script runs.
  const [frame, setFrame] = useState(() => field(0, null))
  const pulse = useRef<number | null>(null)
  const first = useRef(true)

  // A wave starts each time the headline moves on, though not for the first verb.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    pulse.current = performance.now()
  }, [index])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const motion = window.matchMedia(REDUCED_MOTION)
    const start = performance.now()
    let raf = 0
    let last = 0
    let visible = false

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - last < 1000 / FPS) return
      last = now
      let wave: number | null = null
      if (pulse.current !== null) {
        const p = (now - pulse.current) / PULSE_MS
        if (p > 1.2) pulse.current = null
        else wave = p
      }
      setFrame(field((now - start) / 1000, wave))
    }
    const run = () => {
      cancelAnimationFrame(raf)
      raf = 0
      if (visible && !motion.matches && !document.hidden) raf = requestAnimationFrame(tick)
    }
    const sight = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      run()
    })
    sight.observe(el)
    motion.addEventListener('change', run)
    document.addEventListener('visibilitychange', run)
    return () => {
      cancelAnimationFrame(raf)
      sight.disconnect()
      motion.removeEventListener('change', run)
      document.removeEventListener('visibilitychange', run)
    }
  }, [])

  return (
    <div ref={ref} aria-hidden className={`pointer-events-none select-none ${mirrored ? '-scale-x-100' : ''} ${className ?? ''}`}>
      <div className="relative font-mono text-[0.625rem] leading-[1.2] whitespace-pre">
        <pre className="text-white/15">{frame.base}</pre>
        <pre className="absolute inset-0 text-accent">{frame.glow}</pre>
      </div>
    </div>
  )
}
