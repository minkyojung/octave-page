import { StepProvider } from '@/components/StepContext'
import { getLatestRelease } from '@/lib/release'
import { Footer } from '@/sections/Footer'
import { Header } from '@/sections/Header'
import { HeroSection } from '@/sections/HeroSection'
import { Tour } from '@/sections/Tour'
import { Wireframe } from '@/sections/Wireframe'

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
          <Wireframe />
        </StepProvider>
        <Tour />
      </main>
      <Footer />
    </>
  )
}
