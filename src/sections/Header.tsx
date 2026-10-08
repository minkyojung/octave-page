import Image from 'next/image'
import type { Release } from '@/lib/release'

export function Header({ release }: { release: Release }) {
  return (
    <header className="sticky top-0 z-30 bg-background">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2 font-normal tracking-[-0.025em]">
          <Image src="/octave-icon.png" alt="" width={24} height={24} priority className="size-6" />
          octave
        </a>
        <a
          href={release.dmgUrl}
          className="rounded-full border border-line px-3.5 py-1.5 text-[0.8125rem] font-light text-foreground transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          Download
        </a>
      </div>
    </header>
  )
}
