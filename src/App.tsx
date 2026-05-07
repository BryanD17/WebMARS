import LandingPage from '@/landing/LandingPage.tsx'
import { useRoute } from '@/lib/router.ts'
import { Shell } from '@/ui/Shell.tsx'

export default function App() {
  const route = useRoute()

  if (route === 'landing') {
    return <LandingPage />
  }

  return <Shell />
}
