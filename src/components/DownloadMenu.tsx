'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { Release } from '@/lib/release'

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
const item =
  'flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm outline-none data-highlighted:bg-white/10'

export function DownloadMenu({ release }: { release: Release }) {
  return (
    <div className="inline-flex h-10 rounded-full bg-foreground text-background">
      <a
        href={release.dmgUrl}
        className={`inline-flex items-center gap-2 rounded-l-full pr-3.5 pl-4 text-[0.9375rem] font-medium transition-colors hover:bg-white ${focusRing}`}
      >
        <AppleLogo className="size-4" />
        Download for Mac
      </a>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-label="More download options"
          className={`inline-flex items-center rounded-r-full border-l border-black/15 pr-3.5 pl-2.5 transition-colors hover:bg-white data-[state=open]:bg-white ${focusRing}`}
        >
          <Chevron className="size-3.5" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={8}
            className="z-40 min-w-56 rounded-xl border border-line bg-background p-1 text-foreground shadow-xl shadow-black/50"
          >
            <DropdownMenu.Item asChild className={item}>
              <a href={release.dmgUrl}>
                <AppleLogo className="size-4" />
                <span className="flex-1">macOS</span>
                <span className="text-xs text-muted">Apple silicon</span>
              </a>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="mx-2 my-1 h-px bg-line" />
            <DropdownMenu.Item asChild className={item}>
              <a href={release.notesUrl} target="_blank" rel="noreferrer">
                <span className="flex-1">Release notes{release.version && ` · ${release.version}`}</span>
                <ExternalArrow className="size-3.5 text-muted" />
              </a>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild className={item}>
              <a href={release.allUrl} target="_blank" rel="noreferrer">
                <span className="flex-1">All releases</span>
                <ExternalArrow className="size-3.5 text-muted" />
              </a>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}

function AppleLogo({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

function Chevron({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExternalArrow({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 11 11 5M6 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
