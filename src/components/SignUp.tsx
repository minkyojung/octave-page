import { useEffect, useState } from 'react'
import { Github } from 'lucide-react'

// The sign-up worker (worker/). Local runs point this at http://localhost:8787.
const SIGNUP_URL = import.meta.env.VITE_SIGNUP_URL || 'https://octave-signup.flowcap.workers.dev'

type Result = 'ok' | 'cancelled' | 'error' | null

const font = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif'

// The worker sends every sign-up back here with ?signup=ok|cancelled|error.
function readResult(): Result {
  const value = new URLSearchParams(window.location.search).get('signup')
  return value === 'ok' || value === 'cancelled' || value === 'error' ? value : null
}

export function SignUp() {
  const [result] = useState<Result>(readResult)
  const [updates, setUpdates] = useState(false)

  useEffect(() => {
    if (!result) return
    const url = new URL(window.location.href)
    url.searchParams.delete('signup')
    window.history.replaceState(null, '', url)
  }, [result])

  if (result === 'ok') {
    return (
      <p role="status" style={{ fontFamily: font, fontSize: '15px', color: '#191919', marginTop: '28px' }}>
        Thanks for signing up — you're on the list.
      </p>
    )
  }

  return (
    <div style={{ marginTop: '28px', fontFamily: font }}>
      {/* The worker only counts the box as consent when the request says it came from this site. */}
      <a
        href={`${SIGNUP_URL}/auth/github/start?updates=${updates ? 1 : 0}`}
        referrerPolicy="origin"
        className="inline-flex items-center gap-2 rounded-md px-4 h-10 bg-[#191919] text-white transition-colors hover:bg-[#333333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191919] focus-visible:ring-offset-2"
        style={{ fontSize: '14px', fontWeight: 500 }}
      >
        <Github className="size-4" aria-hidden />
        Sign up with GitHub
      </a>

      <label className="flex items-center gap-2 mt-4" style={{ fontSize: '13px', color: '#666666' }}>
        <input type="checkbox" checked={updates} onChange={(e) => setUpdates(e.target.checked)} />
        Email me news about Octave (optional)
      </label>

      <p style={{ fontSize: '12px', color: '#999999', marginTop: '8px', lineHeight: '1.5' }}>
        Signing up keeps your GitHub profile and email. See the{' '}
        <a href="/privacy" className="underline underline-offset-2">
          privacy policy
        </a>
        .
      </p>

      {result && (
        <p role="alert" style={{ fontSize: '13px', color: result === 'error' ? '#C62828' : '#666666', marginTop: '12px' }}>
          {result === 'error' ? 'Something went wrong. Please try again.' : 'Sign-up was cancelled.'}
        </p>
      )}
    </div>
  )
}
