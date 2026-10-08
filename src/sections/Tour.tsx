'use client'

import { motion } from 'motion/react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Decode } from '@/components/Decode'
import { steps } from '@/lib/steps'
import build from '../../public/steps/build.png'
import plan from '../../public/steps/plan.png'
import ship from '../../public/steps/ship.png'

// One window per step, in the same order as `steps`.
const shots = [
  {
    src: plan,
    alt: 'Octave in Plan mode: the agent’s plan to rate-limit the public API, waiting for approval, beside the repositories and their workspaces',
  },
  {
    src: build,
    alt: 'Octave at work: the agent’s edit to the middleware as a diff, and the changed files beside the conversation',
  },
  {
    src: ship,
    alt: 'Octave shipping: the failing test’s fix as a diff, build, test and typecheck passed, and the pull request opened',
  },
]

// The characters in the line under the lit step; it fills one at a time, so this must match `steps()` in `fill`.
const FILL_CHARS = 36

// Plan, Build and Ship, beside the app at that step. One step is open at a time, showing what Octave does in it;
// a line under it fills, and the next takes over. Choosing a step shows it at once. The tour holds still
// while the pointer or focus is in it, while it is off screen, and for anyone who prefers reduced motion (the
// line does not run, so nothing moves on by itself).
export function Tour() {
  const [active, setActive] = useState(0)
  const [held, setHeld] = useState(false)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const sight = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    sight.observe(ref.current)
    return () => sight.disconnect()
  }, [])

  const paused = held || !visible

  return (
    <section
      ref={ref}
      aria-labelledby="tour-title"
      className="mx-auto mt-32 max-w-6xl px-6"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false)
      }}
    >
      <h2 id="tour-title" className="sr-only">
        Features
      </h2>
      <div className="grid gap-10 md:grid-cols-[18rem_1fr] md:items-start md:gap-12">
        <div className="space-y-6">
          {steps.map((step, i) => (
            <div
              key={step.label}
              className={`relative transition-opacity duration-300 ${i === active ? 'opacity-100' : 'opacity-45 hover:opacity-75'}`}
            >
              {/* The whole step is the button's target; the list stays outside it, as a button holds only text. */}
              <button
                type="button"
                aria-pressed={i === active}
                onClick={() => setActive(i)}
                className="font-mono text-xs text-muted after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-md focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-foreground"
              >
                <span aria-hidden>0{i + 1} </span>
                {step.label}
              </button>
              {/* How long until the next step: a row of dots that fills a character at a time, under the step that
                  is lit. */}
              <div aria-hidden className="relative mt-2 font-mono text-xs leading-none whitespace-pre">
                <span className="text-white/15">{'·'.repeat(FILL_CHARS)}</span>
                {i === active && (
                  <span
                    key={active}
                    className="absolute inset-y-0 left-0 animate-fill text-accent motion-reduce:hidden"
                    style={{ animationPlayState: paused ? 'paused' : 'running' }}
                    onAnimationEnd={() => setActive((active + 1) % steps.length)}
                  >
                    {'━'.repeat(FILL_CHARS)}
                  </span>
                )}
              </div>
              {/* Open for the step that is lit, folded away for the others. */}
              <div
                className={`grid transition-[grid-template-rows] duration-300 ${i === active ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <ul className="space-y-3 overflow-hidden">
                  {step.features.map(([name, description], j) => (
                    <li key={name} className={j === 0 ? 'pt-4' : undefined}>
                      {/* The names decode as the step opens, and again each time the tour comes back into view. */}
                      <p className="text-sm font-medium">
                        {i === active && visible ? (
                          <>
                            <span className="sr-only">{name}</span>
                            <span aria-hidden>
                              <Decode key={active} text={name} delay={j * 90} />
                            </span>
                          </>
                        ) : (
                          name
                        )}
                      </p>
                      <p className="mt-0.5 text-sm/relaxed text-muted">{description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="grid overflow-hidden rounded-xl border border-line">
          {shots.map((shot, i) => (
            <motion.div
              key={shot.alt}
              className="col-start-1 row-start-1"
              initial={false}
              animate={{ opacity: i === active ? 1 : 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              aria-hidden={i !== active}
            >
              <Image
                src={shot.src}
                alt={shot.alt}
                sizes="(min-width: 72rem) 48rem, (min-width: 768px) calc(100vw - 24rem), calc(100vw - 3rem)"
                className="h-auto w-full"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
