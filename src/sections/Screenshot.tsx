'use client'

import { motion } from 'motion/react'
import Image from 'next/image'
import { useStep } from '@/components/StepContext'
import build from '../../public/steps/build.png'
import plan from '../../public/steps/plan.png'
import ship from '../../public/steps/ship.png'

// One window per step of the headline, in the same order as `steps`.
const shots = [
  { src: plan, alt: 'Octave in Plan mode: the agent’s plan, waiting for approval' },
  { src: build, alt: 'Octave at work: the agent’s edits and the changed files beside the conversation' },
  { src: ship, alt: 'Octave shipping: every check passed and the pull request open' },
]

// Wider than the text column, as wide as the window allows up to 90rem.
export function Screenshot() {
  const { index } = useStep()

  return (
    <div className="mx-auto my-16 grid w-[min(90rem,100%-3rem)]">
      {shots.map((shot, i) => (
        <motion.div
          key={shot.alt}
          className="col-start-1 row-start-1"
          initial={false}
          animate={{ opacity: i === index ? 1 : 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          aria-hidden={i !== index}
        >
          <Image
            src={shot.src}
            alt={shot.alt}
            priority={i === 0}
            loading={i === 0 ? undefined : 'eager'}
            sizes="(min-width: 90rem) 90rem, calc(100vw - 3rem)"
            className="h-auto w-full"
          />
        </motion.div>
      ))}
    </div>
  )
}
