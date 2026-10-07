'use client'

import { motion } from 'motion/react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { steps } from '@/lib/steps'
import { useStep } from './StepContext'

const TYPE_MS = 90
const DELETE_MS = 45
const HOLD_MS = 2400
const NEXT_MS = 300
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

export function TypedHeadline() {
  const reduceMotion = usePrefersReducedMotion()
  const { index, setIndex } = useStep()
  // The first verb is rendered whole on the server, so the page reads right before any script runs.
  const [length, setLength] = useState(steps[0].verb.length)

  useEffect(() => {
    if (reduceMotion) {
      setIndex(0)
      setLength(steps[0].verb.length)
      return
    }

    let current = 0
    let typed = steps[0].verb.length
    let deleting = true
    let timer = window.setTimeout(step, HOLD_MS)

    function step() {
      if (deleting) {
        if (typed > 0) {
          typed -= 1
          timer = window.setTimeout(step, DELETE_MS)
        } else {
          deleting = false
          current = (current + 1) % steps.length
          setIndex(current)
          timer = window.setTimeout(step, NEXT_MS)
        }
      } else if (typed < steps[current].verb.length) {
        typed += 1
        timer = window.setTimeout(step, TYPE_MS)
      } else {
        deleting = true
        timer = window.setTimeout(step, HOLD_MS)
      }
      setLength(typed)
    }

    return () => window.clearTimeout(timer)
  }, [reduceMotion, setIndex])

  const { verb } = steps[index]

  return (
    <h1 className="text-[clamp(1.75rem,8.5vw,3.75rem)] leading-[1.05] font-semibold tracking-[-0.04em]">
      <span className="sr-only">You bring the idea. Octave plans, builds and ships it.</span>
      <span aria-hidden>
        You bring the idea.
        <br />
        Octave{' '}
        {/* The whole verb, unseen, holds its width, so the centred line does not shift as it is typed. */}
        <span className="relative inline-block">
          <span className="invisible">{verb}</span>
          <span className="absolute top-0 left-0 text-left whitespace-nowrap">
            <span className="text-accent">{verb.slice(0, length)}</span>
            <motion.span
              className="ml-[0.04em] inline-block h-[0.9em] w-[0.06em] translate-y-[0.1em] bg-accent"
              animate={reduceMotion ? { opacity: 1 } : { opacity: [1, 1, 0, 0] }}
              transition={reduceMotion ? { duration: 0 } : { duration: 1.06, times: [0, 0.5, 0.5, 1], repeat: Infinity }}
            />
          </span>
        </span>{' '}
        it.
      </span>
    </h1>
  )
}
