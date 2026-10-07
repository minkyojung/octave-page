import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLatestRelease } from './release'

const RELEASES = 'https://github.com/minkyojung/octave-releases/releases'
const FALLBACK = {
  version: null,
  dmgUrl: `${RELEASES}/latest`,
  notesUrl: `${RELEASES}/latest`,
  allUrl: RELEASES,
}

// The manifest as electron-builder writes it for v0.0.14.
const MANIFEST = `version: 0.0.14
files:
  - url: Octave-0.0.14-arm64-mac.zip
    sha512: abc
    size: 150032346
  - url: Octave-0.0.14-arm64.dmg
    sha512: def
    size: 149889876
path: Octave-0.0.14-arm64-mac.zip
sha512: abc
releaseDate: '2026-10-06T12:49:39.247Z'
`

function respondWith(body: string, status = 200) {
  const fetch = vi.fn(async () => new Response(body, { status }))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getLatestRelease', () => {
  it('links the Apple silicon disk image of the latest release', async () => {
    const fetch = respondWith(MANIFEST)

    expect(await getLatestRelease()).toEqual({
      version: 'v0.0.14',
      dmgUrl: `${RELEASES}/download/v0.0.14/Octave-0.0.14-arm64.dmg`,
      notesUrl: `${RELEASES}/tag/v0.0.14`,
      allUrl: RELEASES,
    })
    expect(fetch).toHaveBeenCalledWith(`${RELEASES}/latest/download/latest-mac.yml`)
  })

  it('falls back to the release page when GitHub does not answer with the manifest', async () => {
    respondWith('Not Found', 404)
    expect(await getLatestRelease()).toEqual(FALLBACK)
  })

  it('falls back when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))))
    expect(await getLatestRelease()).toEqual(FALLBACK)
  })

  it('falls back when the manifest names no disk image', async () => {
    respondWith(MANIFEST.replace('  - url: Octave-0.0.14-arm64.dmg\n', ''))
    expect(await getLatestRelease()).toEqual(FALLBACK)
  })

  it('falls back when the version is not one', async () => {
    respondWith(MANIFEST.replace('version: 0.0.14', 'version: latest'))
    expect(await getLatestRelease()).toEqual(FALLBACK)
  })

  it('does not build a link out of a file name that leaves the release', async () => {
    respondWith(MANIFEST.replace('Octave-0.0.14-arm64.dmg', '../../evil/Octave.dmg'))
    expect(await getLatestRelease()).toEqual(FALLBACK)
  })
})
