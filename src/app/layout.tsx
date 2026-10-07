import type { Metadata } from 'next'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Octave',
  description: 'A native macOS app that gives each piece of work its own workspace, with Claude Code at the table.',
  icons: { icon: '/octave-icon.png' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
