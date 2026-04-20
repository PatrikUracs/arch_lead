'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { RENDERS_ENABLED } from '@/lib/flags'

type SubmissionData = {
  id: string
  render_status: 'pending' | 'complete' | 'failed'
  render_urls: string[] | null
  room_type: string
  design_style: string
  brief: string | null
  results_page_token: string
}

type DesignerData = {
  name: string
  studio_name: string | null
  calendly_url: string | null
}

type ResultsData = {
  submission: SubmissionData
  designer: DesignerData | null
}

const DL = {
  '--dl-bg-page':        '#0F0D0A',
  '--dl-bg-card':        '#181510',
  '--dl-bg-elevated':    '#1A1710',
  '--dl-accent':         '#B8935A',
  '--dl-accent-dim':     'rgba(184, 147, 90, 0.3)',
  '--dl-accent-subtle':  'rgba(184, 147, 90, 0.12)',
  '--dl-text-primary':   '#EDE5D0',
  '--dl-text-muted':     'rgba(237, 229, 208, 0.35)',
  '--dl-border-default': 'rgba(255, 255, 255, 0.05)',
  '--dl-border-accent':  'rgba(184, 147, 90, 0.2)',
  '--dl-rule-gradient':  'linear-gradient(90deg, rgba(184,147,90,0.4) 0%, transparent 70%)',
} as React.CSSProperties

/* ── Extract first 2 sections from brief ───────────────────────── */
function extractBriefSections(brief: string): { label: string; content: string }[] {
  const sections: { label: string; content: string }[] = []
  const lines = brief.split('\n')
  let current: { label: string; lines: string[] } | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    const sectionMatch = trimmed.match(/^(\d+)\)\s+(.+)/)
    if (sectionMatch) {
      if (current && sections.length < 2) sections.push({ label: current.label, content: current.lines.join('\n').trim() })
      if (sections.length >= 2) break
      current = { label: sectionMatch[2], lines: [] }
    } else if (current) {
      current.lines.push(trimmed)
    }
  }

  if (current && sections.length < 2) sections.push({ label: current.label, content: current.lines.join('\n').trim() })
  return sections
}

/* ── Pulse line ─────────────────────────────────────────────────── */
function PulseLine() {
  return (
    <div style={{ position: 'relative', height: 1, background: 'rgba(184, 147, 90, 0.1)', overflow: 'hidden', width: 160, margin: '0 auto' }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', background: 'linear-gradient(90deg, transparent, var(--dl-accent), transparent)', animation: 'dl-scan 1.8s ease-in-out infinite' }} />
    </div>
  )
}

/* ── Lightbox ───────────────────────────────────────────────────── */
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url} alt="Concept full size"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', cursor: 'default', borderRadius: 2 }}
      />
      <button onClick={onClose} style={{ position: 'fixed', top: 20, right: 24, background: 'none', border: 'none', color: 'rgba(237,229,208,0.5)', fontSize: 28, cursor: 'pointer', lineHeight: 1 }}>×</button>
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────────────── */
export default function ResultsPage() {
  const params = useParams()
  const token = params?.token as string

  const [data, setData] = useState<ResultsData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const bgStyle: React.CSSProperties = { ...DL, background: 'var(--dl-bg-page)', minHeight: '100vh' }

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/results-data?token=${token}`)
      if (res.status === 404) { setNotFound(true); return }
      if (!res.ok) return
      const json: ResultsData = await res.json()
      setData(json)
    } catch {
      // silently ignore network errors during polling
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  // Poll while pending — RENDERS_ENABLED: re-enable when Replicate integration is restored (Phase X)
  useEffect(() => {
    if (!RENDERS_ENABLED || !data || data.submission.render_status !== 'pending') return
    const id = setInterval(fetchData, 4000)
    return () => clearInterval(id)
  }, [data, fetchData])

  /* ── Not found ──────────────────────────────────────────────────── */
  if (notFound) {
    return (
      <div style={bgStyle} className="flex items-center justify-center px-4 py-16">
        <div style={{ background: 'var(--dl-bg-card)', border: '1px solid var(--dl-border-default)', borderRadius: 6, padding: '64px 48px', maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 400, color: 'var(--dl-text-primary)', marginBottom: 12 }}>
            Az oldal nem található
          </p>
          <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 13, color: 'var(--dl-text-muted)', lineHeight: 1.7, margin: 0 }}>
            Ez a link érvénytelen vagy lejárt. Keresd a helyes linket az e-mailedben.
          </p>
        </div>
      </div>
    )
  }

  /* ── Loading / pending ──────────────────────────────────────────── */
  // RENDERS_ENABLED: re-enable when Replicate integration is restored (Phase X)
  if (!data || (RENDERS_ENABLED && data.submission.render_status === 'pending')) {
    const designerName = data?.designer?.name ?? ''
    return (
      <div style={bgStyle} className="flex items-center justify-center px-4 py-16">
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          {designerName && (
            <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 400, color: 'var(--dl-text-primary)', letterSpacing: '0.02em', marginBottom: 32 }}>
              {designerName}
            </h1>
          )}
          <PulseLine />
          <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 13, color: 'var(--dl-text-muted)', marginTop: 28, lineHeight: 1.7, letterSpacing: '0.03em' }}>
            A koncepted most készül — ez nagyjából egy percet vesz igénybe.
          </p>
        </div>
      </div>
    )
  }

  /* ── Failed ─────────────────────────────────────────────────────── */
  // RENDERS_ENABLED: re-enable when Replicate integration is restored (Phase X)
  if (RENDERS_ENABLED && data.submission.render_status === 'failed') {
    const dn = data.designer?.name ?? 'The designer'
    return (
      <div style={bgStyle} className="flex items-center justify-center px-4 py-16">
        <div style={{ background: 'var(--dl-bg-card)', border: '1px solid var(--dl-border-default)', borderRadius: 6, padding: '64px 48px', maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 400, color: 'var(--dl-text-primary)', marginBottom: 16 }}>Valami hiba történt</p>
          <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 13, color: 'var(--dl-text-muted)', lineHeight: 1.7, margin: 0 }}>
            A koncepted generálása nem sikerült. {dn} értesítést kapott, és hamarosan felveszi veled a kapcsolatot.
          </p>
        </div>
      </div>
    )
  }

  /* ── Complete ───────────────────────────────────────────────────── */
  const { submission, designer } = data
  const designerName  = designer?.name ?? ''
  const studioName    = designer?.studio_name || designerName
  const briefSections = submission.brief ? extractBriefSections(submission.brief) : []
  const renderUrls    = submission.render_urls ?? []

  return (
    <div style={bgStyle} className="px-4 py-16">
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 32, fontWeight: 400, color: 'var(--dl-text-primary)', letterSpacing: '0.02em', margin: '0 0 8px' }}>
            {designerName}
          </h1>
          {studioName && studioName !== designerName && (
            <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 11, color: 'var(--dl-text-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 20px' }}>
              {studioName}
            </p>
          )}
          <hr style={{ border: 'none', borderTop: '1px solid var(--dl-border-accent)', width: 40, margin: '20px auto 24px' }} />
          <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 13, color: 'var(--dl-text-muted)', letterSpacing: '0.04em', margin: 0 }}>
            A koncepted — {submission.room_type}, {submission.design_style} stílusban
          </p>
        </div>

        {/* Image grid — RENDERS_ENABLED: re-enable when Replicate integration is restored (Phase X) */}
        {RENDERS_ENABLED && renderUrls.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 48 }}>
            {renderUrls.map((url, i) => (
              <div key={i} style={{ position: 'relative', cursor: 'zoom-in' }} onClick={() => setLightboxUrl(url)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Concept ${i + 1}`} style={{ width: '100%', display: 'block', border: '1px solid var(--dl-border-accent)', borderRadius: 2 }} />
              </div>
            ))}
          </div>
        )}

        {/* Renders disabled — holding state */}
        {!RENDERS_ENABLED && (
          <div style={{ background: 'var(--dl-bg-card)', border: '1px solid var(--dl-border-default)', borderRadius: 6, padding: '48px 32px', textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 400, color: 'var(--dl-text-muted)', margin: '0 0 20px', animation: 'dl-pulse 3s ease-in-out infinite' }}>
              A koncept renderek hamarosan érkeznek
            </p>
            <PulseLine />
          </div>
        )}

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--dl-border-default)', marginBottom: 48 }} />

        {/* Brief sections 1 & 2 */}
        {briefSections.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', color: 'rgba(184,147,90,0.7)', textTransform: 'uppercase', fontFamily: 'var(--font-montserrat)', marginBottom: 24 }}>
              Projekt áttekintés
            </p>
            {briefSections.map((section, i) => (
              <div key={i} style={{ marginBottom: 28 }}>
                <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.14em', color: 'var(--dl-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                  {section.label}
                </p>
                <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 13, color: 'rgba(237,229,208,0.6)', lineHeight: 1.8, margin: 0 }}>
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Calendly button */}
        {designer?.calendly_url && (
          <a
            href={designer.calendly_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', width: '100%', background: 'var(--dl-accent)', color: '#0F0D0A', fontWeight: 400, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, padding: '16px 24px', border: 'none', cursor: 'pointer', textAlign: 'center', fontFamily: 'var(--font-montserrat)', textDecoration: 'none', boxSizing: 'border-box' }}
          >
            Tetszik — foglalj időpontot {designerName} designerrel
          </a>
        )}

      </div>
    </div>
  )
}
