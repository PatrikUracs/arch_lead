import type { Metadata } from 'next'
import OnboardForm from '@/components/OnboardForm'

export const metadata: Metadata = { title: 'Regisztráció' }
import SpacioLogo from '@/components/SpacioLogo'
import ThemeToggle from '@/components/ThemeToggle'

export default function OnboardPage() {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 24, left: 32, zIndex: 100 }}>
        <SpacioLogo height={130} />
      </div>
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 100 }}>
        <ThemeToggle />
      </div>
      <OnboardForm />
    </div>
  )
}
