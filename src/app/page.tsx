import { StepProvider } from '@/components/StepContext'
import { getLatestRelease } from '@/lib/release'
import { Features } from '@/sections/Features'
import { Footer } from '@/sections/Footer'
import { Header } from '@/sections/Header'
import { HeroSection } from '@/sections/HeroSection'
import { Screenshot } from '@/sections/Screenshot'

// The download link follows the latest release; look for a new one at most once an hour.
export const revalidate = 3600

export default async function Home() {
  const release = await getLatestRelease()

  return (
    <>
      <Header release={release} />
      <main>
        <StepProvider>
          <HeroSection release={release} />
          <Screenshot />
        </StepProvider>
        <Features />
      </main>
      <Footer />
    </>
  )
}
