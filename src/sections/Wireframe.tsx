'use client'

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { Decode, glyphAt, Placeholder } from '@/components/Decode'
import { useStep } from '@/components/StepContext'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const SPIN = '|/-\\'

// What the window shows: one workspace taking a real change from the ask to a pull request, in the order it
// happens. The agent reads the code and writes a plan you approve; it writes the change; it runs the checks, and
// fixes what fails, before it opens the PR. Every event is [step, ms into that step].
type At = readonly [step: number, ms: number]

const ask = 'Rate-limit the public API per key: 100 requests a minute, 429 with Retry-After. Leave internal routes alone.'

const PLAN_AT: At = [0, 1400]
const PLAN_DONE: At = [0, 2600]
const plan = [
  'Sliding-window limiter on Redis in lib/ratelimit.ts',
  'Apply it to /api/v1/* only, in middleware.ts',
  'Answer 429 with Retry-After and X-RateLimit-* headers',
  'Test the window edge, bursts and a missing key',
]

// The limiter as it is first written, and the line the failing test sends it back to: a burst got one request
// too many.
const code = [
  'export async function limit(key: string, max = 100) {',
  '  const now = Date.now()',
  '  await redis.zremrangebyscore(key, 0, now - WINDOW)',
  '  const used = await redis.zcard(key)',
  '  if (used > max) return { ok: false, retryAfter: 60 }',
  '  await redis.zadd(key, now, `${now}-${seq()}`)',
]
const FIXED = 4
const fixed = '  if (used >= max) return { ok: false, retryAfter: 60 }'

type Item =
  | { kind: 'plan'; at: At }
  | { kind: 'pr'; at: At }
  | {
      kind: 'tool'
      at: At
      tool: string
      target: string
      note?: string
      tone?: 'pass' | 'fail'
      // what shows under the line: the code written, the test that failed, or the fix
      attach?: 'code' | 'failure' | 'fix'
    }

const stream: Item[] = [
  { kind: 'tool', at: [0, 200], tool: 'Read', target: 'middleware.ts' },
  { kind: 'tool', at: [0, 600], tool: 'Grep', target: '"/api/v1"', note: '14 files' },
  { kind: 'tool', at: [0, 1000], tool: 'Read', target: 'lib/redis.ts' },
  { kind: 'plan', at: PLAN_AT },
  { kind: 'tool', at: [1, 0], tool: 'Write', target: 'lib/ratelimit.ts', note: '+86', attach: 'code' },
  { kind: 'tool', at: [1, 1600], tool: 'Edit', target: 'middleware.ts', note: '+24 -3' },
  { kind: 'tool', at: [1, 2200], tool: 'Write', target: 'lib/ratelimit.test.ts', note: '+112' },
  { kind: 'tool', at: [1, 2800], tool: 'Write', target: 'docs/api/limits.md', note: '+31' },
  { kind: 'tool', at: [2, 300], tool: 'Bash', target: 'npm run typecheck', note: '✓', tone: 'pass' },
  { kind: 'tool', at: [2, 700], tool: 'Bash', target: 'npm test', note: '✗ 1 failed', tone: 'fail', attach: 'failure' },
  { kind: 'tool', at: [2, 1400], tool: 'Edit', target: 'lib/ratelimit.ts', note: '+1 -1', attach: 'fix' },
  { kind: 'tool', at: [2, 2000], tool: 'Bash', target: 'npm test', note: '✓ 14 passed', tone: 'pass' },
  { kind: 'tool', at: [2, 2700], tool: 'Bash', target: 'npm run build', note: '✓', tone: 'pass' },
  { kind: 'pr', at: [2, 3400] },
]

const files: [name: string, diff: string, at: At][] = [
  ['lib/ratelimit.ts', '+86 -0', [1, 0]],
  ['middleware.ts', '+24 -3', [1, 1600]],
  ['lib/ratelimit.test.ts', '+112 -0', [1, 2200]],
  ['docs/api/limits.md', '+31 -0', [1, 2800]],
]
const SHIP = { typecheck: 500, failed: 900, fixed: 2200, build: 2900, opened: 3400 }

// The workspaces beside it, all at work at once; the step each one is done by. The first is the one shown,
// done when its pull request opens.
const workspaces = [
  ['rate-limit-api', 2],
  ['flaky-checkout-test', 2],
  ['postgres-17-upgrade', 3],
] as const

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION)
    setReduce(query.matches)
    const change = () => setReduce(query.matches)
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])
  return reduce
}

// A tick every `ms` while `on`, for spinners and flicker.
function useTick(on: boolean, ms: number) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!on) return
    const timer = window.setInterval(() => setTick((t) => t + 1), ms)
    return () => window.clearInterval(timer)
  }, [on, ms])
  return tick
}

// How long the window has been on this step, in ms; every event is timed from it. Forever, with reduced motion.
// The time is kept with the step it was measured on, so a new step reads 0 from its first render, not the time
// the last step ran to.
function useElapsed(step: number, reduce: boolean) {
  const [measured, setMeasured] = useState({ step, ms: 0 })
  useEffect(() => {
    if (reduce) return
    const start = performance.now()
    const timer = window.setInterval(() => {
      const ms = performance.now() - start
      setMeasured({ step, ms })
      // Nothing happens this late into a step.
      if (ms > 5000) window.clearInterval(timer)
    }, 100)
    return () => window.clearInterval(timer)
  }, [step, reduce])
  if (reduce) return Infinity
  return measured.step === step ? measured.ms : 0
}

function Title({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-2 text-muted">
      <span>{children}</span>
      {aside}
    </div>
  )
}

// The text once its moment has come, decoding as it appears; dots in its shape until then.
function Shown({ when, text }: { when: boolean; text: string }) {
  return when ? <Decode text={text} /> : <Placeholder text={text} />
}

function Mark({ state }: { state: 'waiting' | 'failed' | 'passed' }) {
  if (state === 'passed') return <span className="text-accent">✓</span>
  if (state === 'failed') return <span className="text-red-400">✗</span>
  return <span className="text-muted">◦</span>
}

function Spinner({ on }: { on: boolean }) {
  const tick = useTick(on, 120)
  return <span className="inline-block w-[1ch] text-accent">{SPIN[tick % SPIN.length]}</span>
}

// Words that flicker as they work, a letter or two at a time, like a label about to settle.
function Flicker({ words }: { words: string }) {
  const tick = useTick(true, 90)
  return <>{[...words].map((c, i) => ((i * 7 + tick) % 13 === 0 && c !== ' ' ? glyphAt(i + tick) : c)).join('')}</>
}

// A line of code with its number, and a sign for a diff: blank, - in red or + in green.
function CodeLine({ n, sign = ' ', children }: { n: number; sign?: ' ' | '-' | '+'; children: ReactNode }) {
  const tone = sign === '-' ? 'bg-red-500/10 text-red-400' : sign === '+' ? 'bg-green-500/10 text-green-400' : ''
  return (
    <div className={`flex gap-3 px-3 whitespace-pre ${tone}`}>
      <span className={`w-[2ch] shrink-0 text-right ${sign === ' ' ? 'text-muted' : ''}`}>{n}</span>
      <span className="shrink-0">{sign}</span>
      <span className="min-w-0 overflow-hidden">{children}</span>
    </div>
  )
}

function CodeBlock({ children }: { children: ReactNode }) {
  return <div className="mt-2.5 overflow-hidden rounded-lg border border-line py-2 leading-6">{children}</div>
}

// A column of a fixed height that keeps its newest line in view: once what is in it runs past the bottom, it
// slides up, and the oldest lines fade out at the top.
function Follow({ reduce, children }: { reduce: boolean; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const o = outer.current
    const i = inner.current
    if (!o || !i) return
    const measure = () => setOffset(Math.min(0, o.clientHeight - i.offsetHeight))
    const sizes = new ResizeObserver(measure)
    sizes.observe(o)
    sizes.observe(i)
    return () => sizes.disconnect()
  }, [])
  return (
    <div
      ref={outer}
      className={`h-[28rem] overflow-hidden ${offset < 0 ? 'mask-[linear-gradient(to_bottom,transparent,black_4rem)]' : ''}`}
    >
      <div
        ref={inner}
        className="space-y-3 p-5"
        style={{ transform: `translateY(${offset}px)`, transition: reduce ? undefined : 'transform 500ms ease' }}
      >
        {children}
      </div>
    </div>
  )
}

// The app window drawn as a wireframe, at work on whichever step the headline is on: planning, then building
// (every workspace at once), then shipping, then round again.
export function Wireframe() {
  const { index } = useStep()
  const reduce = usePrefersReducedMotion()
  // With reduced motion the headline stays on Plan; the window shows the whole run, finished, instead.
  const step = reduce ? 2 : index
  const elapsed = useElapsed(step, reduce)
  const reached = ([s, ms]: At) => step > s || (step === s && elapsed >= ms)

  // Each time round, the window starts from blank again, so everything decodes afresh.
  const [cycle, setCycle] = useState(0)
  const last = useRef(index)
  useEffect(() => {
    if (index < last.current) setCycle((c) => c + 1)
    last.current = index
  }, [index])

  const failed = reached([2, SHIP.failed])
  const passed = reached([2, SHIP.fixed])
  const opened = reached([2, SHIP.opened])

  const status =
    step === 0
      ? reached(PLAN_AT)
        ? 'Waiting for your approval…'
        : 'Reading the code…'
      : step === 1
        ? 'Writing the limiter…'
        : failed && !passed
          ? 'Fixing 1 failing test…'
          : 'Running checks…'

  const checks: [name: string, time: string, state: 'waiting' | 'failed' | 'passed'][] = [
    ['typecheck', '6s', reached([2, SHIP.typecheck]) ? 'passed' : 'waiting'],
    ['test', passed ? '9s' : '1 failed', passed ? 'passed' : failed ? 'failed' : 'waiting'],
    ['build', '21s', reached([2, SHIP.build]) ? 'passed' : 'waiting'],
  ]

  return (
    <div
      aria-hidden
      className="mx-auto mt-16 w-[min(64rem,100%-3rem)] overflow-hidden rounded-xl border border-line font-mono text-xs"
    >
      {/* the title bar: traffic lights and the open tabs */}
      <div className="flex h-10 items-center gap-4 border-b border-line px-4">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2.5 rounded-full border border-line" />
          ))}
        </div>
        <span className="rounded-md border border-line px-3 py-1 text-muted">Rate limiting</span>
        <span className="px-3 py-1">
          <Placeholder text="Checkout test" />
        </span>
      </div>

      <Fragment key={cycle}>
        <div className="grid md:grid-cols-[13.5rem_1fr_16.5rem]">
          {/* the workspaces, all at work at once */}
          <div className="hidden border-r border-line p-5 md:block">
            <Title>Workspaces</Title>
            <div className="space-y-2.5">
              {workspaces.map(([name, doneAt], i) => (
                <div key={name} className="flex items-center gap-2 text-muted">
                  {(i === 0 ? opened : step >= doneAt) ? (
                    <span className="w-[1ch] text-accent">✓</span>
                  ) : step >= 1 ? (
                    <Spinner on={!reduce} />
                  ) : (
                    <span className="w-[1ch]">◦</span>
                  )}
                  <span className={i === 0 ? 'text-foreground' : undefined}>{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* the conversation, in the order it happens */}
          <div className="min-w-0">
            <Follow reduce={reduce}>
              <div className="mb-5 ml-auto w-fit max-w-[85%] rounded-lg border border-line px-3 py-2 leading-relaxed text-muted">
                {ask}
              </div>
              {stream.map((item) => {
                if (!reached(item.at)) return null
                const key = `${item.at}`

                if (item.kind === 'plan') {
                  return (
                    <div key={key} className="my-5 rounded-lg border border-line p-4">
                      <Title
                        aside={
                          step >= 1 ? (
                            <span>
                              <span className="text-accent">✓</span> approved
                            </span>
                          ) : reached(PLAN_DONE) ? (
                            <span>waiting for approval</span>
                          ) : null
                        }
                      >
                        Plan
                      </Title>
                      <div className="space-y-2.5">
                        {plan.map((line, i) => (
                          <div key={line} className="flex gap-3">
                            <span className="text-muted">{i + 1}</span>
                            <Shown when={reached([0, PLAN_AT[1] + i * 300])} text={line} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }

                if (item.kind === 'pr') {
                  return (
                    <div key={key} className="pt-2">
                      <span className="text-accent">✓</span> Opened <Decode text="PR #142 · rate-limit-api → main" />
                    </div>
                  )
                }

                const [s, ms] = item.at
                return (
                  <div key={key}>
                    <div className="flex gap-3">
                      <span className="w-[5ch] shrink-0 text-muted">{item.tool}</span>
                      <span className="min-w-0 flex-1 truncate">
                        <Decode text={item.target} />
                      </span>
                      {item.note && (
                        <span className={item.tone === 'pass' ? 'text-accent' : item.tone === 'fail' ? 'text-red-400' : 'text-muted'}>
                          <Decode text={item.note} />
                        </span>
                      )}
                    </div>

                    {item.attach === 'code' && (
                      <CodeBlock>
                        {code.map((line, i) =>
                          reached([s, ms + 200 + i * 180]) ? (
                            <CodeLine key={i} n={i + 1}>
                              <Decode text={line} />
                            </CodeLine>
                          ) : null,
                        )}
                      </CodeBlock>
                    )}

                    {item.attach === 'failure' && (
                      <div className="mt-1.5 pl-[calc(5ch+0.75rem)] text-red-400/80">
                        <Decode text="✗ bursts › the 101st request gets 429 (got 200)" decoding="" />
                      </div>
                    )}

                    {item.attach === 'fix' && (
                      <CodeBlock>
                        <CodeLine n={FIXED}>{code[FIXED - 1]}</CodeLine>
                        <CodeLine n={FIXED + 1} sign="-">
                          {code[FIXED]}
                        </CodeLine>
                        <CodeLine n={FIXED + 1} sign="+">
                          <Decode text={fixed} decoding="" />
                        </CodeLine>
                      </CodeBlock>
                    )}
                  </div>
                )
              })}
            </Follow>
          </div>

          {/* the changes, then the checks */}
          <div className="space-y-7 border-t border-line p-5 md:border-t-0 md:border-l">
            <div>
              <Title>Changes</Title>
              <div className="space-y-2.5">
                {files.map(([name, diff, at]) => (
                  <div key={name} className="flex justify-between gap-2">
                    <Shown when={reached(at)} text={name} />
                    <span className="text-muted">
                      <Shown when={reached(at)} text={diff} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Title>Checks</Title>
              <div className="space-y-2.5">
                {checks.map(([name, time, state]) => (
                  <div key={name} className="flex justify-between gap-2">
                    <span className="flex gap-2">
                      <Mark state={state} />
                      <Shown when={state !== 'waiting'} text={name} />
                    </span>
                    <span className={state === 'failed' ? 'text-red-400' : 'text-muted'}>
                      <Shown key={time} when={state !== 'waiting'} text={time} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* where it is up to */}
        <div className="flex h-10 items-center justify-end border-t border-line px-4">
          {opened ? (
            <span className="text-foreground">
              <span className="text-accent">✓</span> PR #142 opened
            </span>
          ) : (
            <span className="text-muted">
              <Spinner on={!reduce} /> <Flicker key={status} words={status} />
            </span>
          )}
        </div>
      </Fragment>
    </div>
  )
}
