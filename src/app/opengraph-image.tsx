import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { field, RAMP } from '@/lib/ideaField'

// The picture a shared link shows: the headline as the page sets it, the idea drifting either side of it, and
// the app at the end of a run rising from below. Drawn once, when the site is built.

export const alt = 'Octave: You bring the idea. Octave ships it.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const BACKGROUND = '#0a0a0a'
const FOREGROUND = '#ededed'
const ACCENT = '#92c5fe'

const png = (bytes: Buffer) => `data:image/png;base64,${bytes.toString('base64')}`

// Each file named in full, so the build traces these and nothing else.
const [regular, mono, icon, shot] = await Promise.all([
  readFile(join(process.cwd(), 'node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf')),
  readFile(join(process.cwd(), 'node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.ttf')),
  readFile(join(process.cwd(), 'public/octave-icon.png')).then(png),
  readFile(join(process.cwd(), 'public/steps/ship.png')).then(png),
])

// A still of the page's cloud, its edge beside the words on the right; mirrored for the left.
const cloud = field(4, null).base.split('\n')
const mirrored = cloud.map((line) => [...line].reverse().join(''))

// Each character in the accent, brighter the denser it is, as the wave that runs through it on the page.
const tint = (ch: string) => `rgba(146, 197, 254, ${(0.22 + 0.16 * RAMP.indexOf(ch)).toFixed(2)})`

function Cloud({ lines, side }: { lines: string[]; side: 'left' | 'right' }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 236,
        [side]: 70,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Geist Mono',
        fontSize: 13,
        lineHeight: 1.25,
      }}
    >
      {lines.map((line, i) => (
        <div key={i} style={{ display: 'flex', whiteSpace: 'pre' }}>
          {[...line].map((ch, j) => (
            <span key={j} style={{ color: ch === ' ' ? 'transparent' : tint(ch) }}>
              {ch}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          background: BACKGROUND,
          color: FOREGROUND,
          fontFamily: 'Geist',
        }}
      >
        <Cloud lines={mirrored} side="left" />
        <Cloud lines={cloud} side="right" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 52, fontSize: 30, fontWeight: 400 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- an image in an ImageResponse, not on a page */}
          <img src={icon} width={34} height={34} alt="" />
          octave
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 34,
            fontSize: 80,
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: -4.4,
          }}
        >
          <div>You bring the idea.</div>
          <div style={{ display: 'flex' }}>
            Octave&nbsp;<span style={{ color: ACCENT }}>ships</span>&nbsp;it.
          </div>
        </div>

        {/* The app at the end of a run, rising from the bottom edge. */}
        <div
          style={{
            position: 'absolute',
            top: 400,
            left: 230,
            width: 740,
            height: 555,
            display: 'flex',
            overflow: 'hidden',
            borderRadius: 14,
            border: '1px solid #262626',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- an image in an ImageResponse, not on a page */}
          <img src={shot} width={740} height={555} alt="" />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Geist', data: regular, weight: 400, style: 'normal' },
        { name: 'Geist Mono', data: mono, weight: 400, style: 'normal' },
      ],
    },
  )
}
