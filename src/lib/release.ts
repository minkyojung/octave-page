const RELEASES_URL = 'https://github.com/minkyojung/octave-releases/releases'

export type Release = {
  /** The tag, such as v0.0.14, or null when the latest release could not be read. */
  version: string | null
  /** The Apple silicon disk image, or the latest release's page when it could not be found. */
  dmgUrl: string
  notesUrl: string
  allUrl: string
}

// The disk image's name carries the version, so it is read from the updater's manifest,
// which every release carries under the same name — a plain download, not the rate-limited API.
// Anything going wrong falls back to the release page.
export async function getLatestRelease(): Promise<Release> {
  const fallback = { version: null, dmgUrl: `${RELEASES_URL}/latest`, notesUrl: `${RELEASES_URL}/latest`, allUrl: RELEASES_URL }
  try {
    const response = await fetch(`${RELEASES_URL}/latest/download/latest-mac.yml`)
    if (!response.ok) return fallback
    const manifest = await response.text()
    const version = manifest.match(/^version: (\d+\.\d+\.\d+[\w.-]*)$/m)?.[1]
    const dmg = manifest.match(/^\s+- url: ([\w.-]+\.dmg)$/m)?.[1]
    if (!version || !dmg) return fallback
    const tag = `v${version}`
    return { version: tag, dmgUrl: `${RELEASES_URL}/download/${tag}/${dmg}`, notesUrl: `${RELEASES_URL}/tag/${tag}`, allUrl: RELEASES_URL }
  } catch {
    return fallback
  }
}
