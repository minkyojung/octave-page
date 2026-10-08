import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { ReactNode } from 'react'
import './globals.css'

const title = 'Octave'
const description = 'A native macOS app that gives each piece of work its own workspace, with Claude Code at the table.'

// The icons and the shared image are the files beside this one (icon, apple-icon, opengraph-image); X uses the
// shared image too, having no twitter-image of its own.
export const metadata: Metadata = {
  metadataBase: new URL('https://www.octave.run'),
  title,
  description,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', url: '/', siteName: 'Octave', title, description },
  twitter: { card: 'summary_large_image', title, description },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
