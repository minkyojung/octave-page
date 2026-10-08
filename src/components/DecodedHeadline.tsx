'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { steps } from '@/lib/steps'
import { useStep } from './StepContext'

const HOLD_MS = 2600
const DECODE_MS = 550
// A new scramble at most this often, so the letters flicker rather than blur.
const FLICKER_MS = 45
// Lowercase letters, but for the widest, so a scrambled verb stays near the width of a real one.
const LETTERS = 'abcdefghijklnopqrstuvxyz'
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

// Read on the client only, so the server render and hydration always agree.
function subscribe(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(REDUCED_MOTION).matches, () => false)
}

// The headline, its verb decoding from one step to the next out of flickering letters, left to right.
export function DecodedHeadline() {
  const reduceMotion = usePrefersReducedMotion()
  const { setIndex } = useStep()
  // The first verb is rendered whole on the server, so the page reads right before any script runs.
  const [shown, setShown] = useState<string>(steps[0].verb)

  useEffect(() => {
    if (reduceMotion) {
      setIndex(0)
      setShown(steps[0].verb)
      return
    }

    let current = 0
    let frame = 0
    let timer = window.setTimeout(next, HOLD_MS)

    function next() {
      current = (current + 1) % steps.length
      setIndex(current)
      const verb = steps[current].verb
      const start = performance.now()
      let drawn = 0
      const tick = (now: number) => {
        const elapsed = now - start
        if (elapsed >= DECODE_MS) {
          setShown(verb)
          timer = window.setTimeout(next, HOLD_MS)
          return
        }
        if (now - drawn >= FLICKER_MS) {
          drawn = now
          const solved = Math.floor((elapsed / DECODE_MS) * verb.length)
          setShown([...verb].map((c, i) => (i < solved ? c : LETTERS[Math.floor(Math.random() * LETTERS.length)])).join(''))
        }
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }

    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [reduceMotion, setIndex])

  return (
    <h1 className="text-[clamp(1.75rem,8.5vw,3.75rem)] leading-[1.05] font-normal tracking-[-0.055em]">
      <span className="sr-only">You bring the idea. Octave plans, builds and ships it.</span>
      <span aria-hidden>
        You bring the idea.
        <br />
        Octave{' '}
        {/* Every verb, unseen, in one cell: the cell is as wide as the widest. The verb shown sits over it without
            taking up room, so the centred line never shifts, even while the letters are scrambled. */}
        <span className="relative inline-grid text-accent">
          {steps.map(({ verb }) => (
            <span key={verb} className="invisible col-start-1 row-start-1">
              {verb}
            </span>
          ))}
          <span className="absolute inset-x-0 top-0 text-center whitespace-nowrap">{shown}</span>
        </span>{' '}
        it.
      </span>
    </h1>
  )
}
