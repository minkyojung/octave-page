'use client'

import { useEffect, useRef, useState } from 'react'
import { field } from '@/lib/ideaField'
import { useStep } from './StepContext'

// A faint field of drifting characters, the idea before it takes shape, densest low and towards the words it
// sits beside. Each time the headline moves on a step, a wave of the accent colour runs down through it, towards
// the window below, where the work happens.

const FPS = 12
const PULSE_MS = 900
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

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
