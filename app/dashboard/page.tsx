'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SpacioLogo from '@/components/SpacioLogo'
import ThemeToggle from '@/components/ThemeToggle'

export default function DashboardIndexPage() {
  const router = useRouter()
  const [slug, setSlug] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const clean = slug.trim().toLowerCase()
    if (clean) router.push(`/dashboard/${clean}`)
  }

  return (
    <div style={{ background: 'var(--dl-bg-page)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ position: 'fixed', top: 24, left: 32, zIndex: 100 }}>
        <SpacioLogo height={130} />
      </div>
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 100 }}>
        <ThemeToggle />
      </div>

      <div style={{ background: 'var(--dl-bg-card)', border: '1px solid var(--dl-border-accent)', borderRadius: 6, width: '100%', maxWidth: 400, padding: '48px' }}>
        <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', color: 'var(--dl-accent)', textTransform: 'uppercase', marginBottom: 20 }}>
          Bejelentkezés
        </p>
        <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 400, color: 'var(--dl-text-primary)', margin: '0 0 8px', letterSpacing: '0.02em' }}>
          Stúdió dashboard
        </h1>
        <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 13, color: 'var(--dl-text-muted)', margin: '0 0 32px', lineHeight: 1.7 }}>
          Add meg a stúdiód URL-azonosítóját a belépéshez.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.14em', color: 'var(--dl-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            Stúdió azonosító
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="pl. kovacs-design"
            autoFocus
            className="form-input"
            style={{ marginBottom: 24 }}
          />
          <button
            type="submit"
            disabled={!slug.trim()}
            style={{ width: '100%', background: 'var(--dl-accent)', color: 'var(--dl-bg-page)', fontFamily: 'var(--font-montserrat)', fontWeight: 400, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, padding: '16px 24px', border: 'none', cursor: slug.trim() ? 'pointer' : 'not-allowed', opacity: slug.trim() ? 1 : 0.5, transition: 'opacity 0.2s ease' }}
          >
            Tovább
          </button>
        </form>
      </div>
    </div>
  )
}
