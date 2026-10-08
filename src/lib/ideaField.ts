// The idea before it takes shape: a cloud of characters, densest low and towards the words it sits beside,
// drifting with time. Pure, so the page animates it (IdeaField.tsx) and the shared image draws a still of it
// (opengraph-image.tsx).

const COLS = 34
const ROWS = 12
export const RAMP = ' ·:;+*'
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
