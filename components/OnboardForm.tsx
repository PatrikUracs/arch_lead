'use client'

import { useState } from 'react'

type FormData = {
  name: string
  studioName: string
  portfolioUrl: string
  styleKeywords: string
  typicalProjectSize: string
  ratePerSqm: string
  bio: string
  calendlyUrl: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

function SectionHeader({ label, first }: { label: string; first?: boolean }) {
  return (
    <div style={{ marginTop: first ? 0 : 32, marginBottom: 20 }}>
      {!first && <hr className="section-divider" />}
      <span
        style={{
          fontSize: 9,
          fontWeight: 300,
          letterSpacing: '0.2em',
          color: 'rgba(201, 169, 110, 0.7)',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-montserrat)',
        }}
      >
        {label}
      </span>
    </div>
  )
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        fontSize: 10,
        fontWeight: 300,
        letterSpacing: '0.14em',
        color: 'rgba(245, 240, 232, 0.6)',
        textTransform: 'uppercase',
        marginBottom: 8,
        fontFamily: 'var(--font-montserrat)',
      }}
    >
      {children}
    </label>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: 'rgba(245, 240, 232, 0.35)', fontSize: 12, marginTop: 6, fontFamily: 'var(--font-montserrat)', fontWeight: 200, lineHeight: 1.5 }}>
      {children}
    </p>
  )
}

export default function OnboardForm({ slug, accessKey }: { slug: string; accessKey: string }) {
  const [form, setForm] = useState<FormData>({
    name: '',
    studioName: '',
    portfolioUrl: '',
    styleKeywords: '',
    typicalProjectSize: '',
    ratePerSqm: '',
    bio: '',
    calendlyUrl: '',
  })
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(
    ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = ev.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!form.name.trim()) return
    setStatus('loading')
    setErrorMsg('')

    const keywords = form.styleKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 5)

    try {
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: form.name,
          studioName: form.studioName || undefined,
          portfolioUrl: form.portfolioUrl || undefined,
          styleKeywords: keywords,
          typicalProjectSize: form.typicalProjectSize || undefined,
          ratePerSqm: form.ratePerSqm || undefined,
          bio: form.bio || undefined,
          calendlyUrl: form.calendlyUrl || undefined,
          key: accessKey,
        }),
      })
      if (!res.ok) {
        let message = 'Something went wrong.'
        try {
          const data = await res.json()
          message = data.error || message
        } catch { /* response wasn't JSON */ }
        throw new Error(message)
      }
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  const cardStyle: React.CSSProperties = {
    background: '#111111',
    border: '1px solid rgba(201, 169, 110, 0.4)',
    borderRadius: 2,
    boxShadow: '0 0 80px rgba(201, 169, 110, 0.04), 0 4px 60px rgba(0, 0, 0, 0.6)',
    width: '100%',
    maxWidth: 600,
  }

  if (status === 'success') {
    return (
      <div
        style={{ background: 'radial-gradient(ellipse at center, #141414 0%, #0A0A0A 70%)', minHeight: '100vh' }}
        className="flex items-center justify-center px-4 py-16"
      >
        <div style={{ ...cardStyle, padding: '64px 48px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke="#C9A96E" strokeWidth="1.5" opacity="0.35" />
              <path d="M8 14L12 18L20 10" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: 24,
              fontWeight: 400,
              color: '#F5F0E8',
              marginBottom: 12,
              letterSpacing: '0.02em',
            }}
          >
            Profile saved
          </h2>
          <p
            style={{
              color: 'rgba(245, 240, 232, 0.7)',
              fontSize: 15,
              lineHeight: 1.7,
              maxWidth: 340,
              margin: '0 auto',
              fontFamily: 'var(--font-montserrat)',
              fontWeight: 200,
            }}
          >
            Your style profile is live. New client briefs will now be personalised to your aesthetic.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ background: 'radial-gradient(ellipse at center, #141414 0%, #0A0A0A 70%)', minHeight: '100vh' }}
      className="flex items-center justify-center px-4 py-16"
    >
      <div style={cardStyle}>

        {/* Header */}
        <div className="card-header">
          <h1
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: 34,
              fontWeight: 400,
              letterSpacing: '0.02em',
              color: '#F5F0E8',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Designer Profile
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-montserrat)',
              fontSize: 11,
              fontWeight: 200,
              color: 'rgba(245, 240, 232, 0.5)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginTop: 10,
            }}
          >
            This shapes how AI briefs are written for your leads
          </p>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(201, 169, 110, 0.2)', width: 40, margin: '20px auto 0' }} />
        </div>

        <form onSubmit={handleSubmit} noValidate className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column' }}>

            {/* Identity */}
            <section>
              <SectionHeader label="Identity" first />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                <div>
                  <FieldLabel htmlFor="name">Display name *</FieldLabel>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Patrik Uracs"
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="studioName">Studio name</FieldLabel>
                  <input
                    id="studioName"
                    name="studioName"
                    type="text"
                    value={form.studioName}
                    onChange={handleChange}
                    placeholder="e.g. Patrik Uracs Interior Design"
                    className="form-input"
                  />
                  <FieldHint>Used in email subjects and the client results page. Defaults to your display name if left blank.</FieldHint>
                </div>

                <div>
                  <FieldLabel htmlFor="portfolioUrl">Portfolio URL</FieldLabel>
                  <input
                    id="portfolioUrl"
                    name="portfolioUrl"
                    type="url"
                    value={form.portfolioUrl}
                    onChange={handleChange}
                    placeholder="https://yourportfolio.com"
                    className="form-input"
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="bio">
                    Short bio{' '}
                    <span style={{ color: 'rgba(201, 169, 110, 0.4)', textTransform: 'none', letterSpacing: 0, fontWeight: 200 }}>
                      (optional)
                    </span>
                  </FieldLabel>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={3}
                    value={form.bio}
                    onChange={handleChange}
                    placeholder="2–3 sentences about your design approach…"
                    className="form-input"
                  />
                </div>

              </div>
            </section>

            {/* Style */}
            <section>
              <SectionHeader label="Style & scope" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                <div>
                  <FieldLabel htmlFor="styleKeywords">Style keywords</FieldLabel>
                  <input
                    id="styleKeywords"
                    name="styleKeywords"
                    type="text"
                    value={form.styleKeywords}
                    onChange={handleChange}
                    placeholder="e.g. minimalist, warm tones, natural materials, Japandi"
                    className="form-input"
                  />
                  <FieldHint>Up to 5 keywords, comma-separated. These are injected into every brief.</FieldHint>
                </div>

                <div>
                  <FieldLabel htmlFor="typicalProjectSize">Typical project size</FieldLabel>
                  <input
                    id="typicalProjectSize"
                    name="typicalProjectSize"
                    type="text"
                    value={form.typicalProjectSize}
                    onChange={handleChange}
                    placeholder="e.g. 20–80 m²"
                    className="form-input"
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="ratePerSqm">Rate range (per m²)</FieldLabel>
                  <input
                    id="ratePerSqm"
                    name="ratePerSqm"
                    type="text"
                    value={form.ratePerSqm}
                    onChange={handleChange}
                    placeholder="e.g. 15,000–25,000 HUF/m²"
                    className="form-input"
                  />
                  <FieldHint>Used by the AI to assess whether a client&apos;s budget is realistic for your rate.</FieldHint>
                </div>

                <div>
                  <FieldLabel htmlFor="calendlyUrl">
                    Booking link{' '}
                    <span style={{ color: 'rgba(201, 169, 110, 0.4)', textTransform: 'none', letterSpacing: 0, fontWeight: 200 }}>
                      (optional)
                    </span>
                  </FieldLabel>
                  <input
                    id="calendlyUrl"
                    name="calendlyUrl"
                    type="url"
                    value={form.calendlyUrl}
                    onChange={handleChange}
                    placeholder="https://calendly.com/yourname"
                    className="form-input"
                  />
                  <FieldHint>Your Calendly, Cal.com, or any booking page URL. Shown to clients after they receive their concept.</FieldHint>
                </div>

              </div>
            </section>

            {/* Submit */}
            <div style={{ paddingTop: 32 }}>
              {status === 'error' && (
                <p style={{ color: 'rgba(220, 130, 90, 0.9)', fontSize: 12, marginBottom: 12, fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
                  {errorMsg}
                </p>
              )}
              <button
                type="submit"
                disabled={status === 'loading' || !form.name.trim()}
                style={{
                  width: '100%',
                  background: '#C9A96E',
                  color: '#0A0A0A',
                  fontWeight: 400,
                  fontSize: 11,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  borderRadius: 2,
                  padding: '16px 24px',
                  border: 'none',
                  cursor: status === 'loading' || !form.name.trim() ? 'not-allowed' : 'pointer',
                  opacity: status === 'loading' || !form.name.trim() ? 0.6 : 1,
                  transition: 'all 0.25s ease',
                  fontFamily: 'var(--font-montserrat)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                onMouseEnter={(e) => {
                  if (status !== 'loading' && form.name.trim()) {
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#D4B07A'
                    ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
                  }
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = '#C9A96E'
                  ;(e.currentTarget as HTMLButtonElement).style.transform = ''
                }}
                onMouseDown={(e) => {
                  if (status !== 'loading' && form.name.trim()) {
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#BF9A60'
                    ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0px)'
                  }
                }}
                onMouseUp={(e) => {
                  if (status !== 'loading' && form.name.trim()) {
                    ;(e.currentTarget as HTMLButtonElement).style.background = '#D4B07A'
                    ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
                  }
                }}
              >
                {status === 'loading' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span className="loading-dot" />
                    <span className="loading-dot" />
                    <span className="loading-dot" />
                  </span>
                ) : (
                  'Save profile'
                )}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}
