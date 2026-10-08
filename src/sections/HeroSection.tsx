import { DownloadMenu } from '@/components/DownloadMenu'
import { DecodedHeadline } from '@/components/DecodedHeadline'
import { IdeaField } from '@/components/IdeaField'
import type { Release } from '@/lib/release'

export function HeroSection({ release }: { release: Release }) {
  return (
    <section className="mx-auto max-w-[39rem] px-6 pt-24 text-center tracking-[-0.01em] md:pt-32">
      <DecodedHeadline />
      {/* The idea, drifting either side of the words and the button, on screens wide enough to hold it. */}
      <div className="relative">
        <IdeaField mirrored className="absolute right-full bottom-0 mr-6 hidden xl:block" />
        <IdeaField className="absolute bottom-0 left-full ml-6 hidden xl:block" />
        <p className="mx-auto mt-6 max-w-lg text-balance font-light text-muted">
          A native macOS app that gives each piece of work its own workspace, with Claude Code at the table, from the
          first plan to the pull request.
        </p>
        <div className="mt-8">
          <DownloadMenu release={release} />
          <p className="mt-3 font-mono text-xs text-muted">
            {release.version ?? 'macOS'} · Apple silicon ·{' '}
            <a href={release.notesUrl} className="whitespace-nowrap underline underline-offset-2 hover:text-foreground">
              Release notes
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
