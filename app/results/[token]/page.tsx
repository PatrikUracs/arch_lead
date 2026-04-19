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

/* ── Extract first 2 sections from brief ─────────────────────────── */
function extractBriefSections(brief: string): { label: string; content: string }[] {
  const sections: { label: string; content: string }[] = []
  const lines = brief.split('\n')
  let current: { label: string; lines: string[] } | null = null

  for (const line of lines) {
    const trimmed = line.trim()
    const sectionMatch = trimmed.match(/^(\d+)\)\s+(.+)/)
    if (sectionMatch) {
      if (current && sections.length < 2) {
        sections.push({ label: current.label, content: current.lines.join('\n').trim() })
      }
      if (sections.length >= 2) break
      current = { label: sectionMatch[2], lines: [] }
    } else if (current) {
      current.lines.push(trimmed)
    }
  }

  if (current && sections.length < 2) {
    sections.push({ label: current.label, content: current.lines.join('\n').trim() })
  }

  return sections
}

/* ── Loading pulse line ──────────────────────────────────────────── */
function PulseLine() {
  return (
    <>
      <style>{`
        @keyframes dl-pulse {
          0%   { opacity: 0.3; transform: translateX(-100%); }
          50%  { opacity: 1; }
          100% { opacity: 0.3; transform: translateX(100%); }
        }
        .dl-pulse-track {
          position: relative;
          height: 1px;
          background: rgba(201, 169, 110, 0.1);
          overflow: hidden;
          width: 160px;
          margin: 0 auto;
        }
        .dl-pulse-bar {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, #C9A96E, transparent);
          animation: dl-pulse 2s ease-in-out infinite;
        }
      `}</style>
      <div className="dl-pulse-track">
        <div className="dl-pulse-bar" />
      </div>
    </>
  )
}

/* ── Lightbox ────────────────────────────────────────────────────── */
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, cursor: 'zoom-out',
      }}
    >
      <img
        src={url}
        alt="Concept full size"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', cursor: 'default', borderRadius: 2 }}
      />
      <button
        onClick={onClose}
        style={{
          position: 'fixed', top: 20, right: 24, background: 'none', border: 'none',
          color: 'rgba(245,240,232,0.5)', fontSize: 28, cursor: 'pointer', lineHeight: 1,
        }}
      >×</button>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function ResultsPage() {
  const params = useParams()
  const token = params?.token as string

  const [data, setData] = useState<ResultsData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  const bgStyle: React.CSSProperties = {
    background: 'radial-gradient(ellipse at center, #141414 0%, #0A0A0A 70%)',
    minHeight: '100vh',
  }

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

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
        <div
          style={{
            background: '#111111',
            border: '1px solid rgba(201, 169, 110, 0.15)',
            borderRadius: 2,
            padding: '64px 48px',
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: 22,
              fontWeight: 400,
              color: '#F5F0E8',
              marginBottom: 12,
            }}
          >
            Page not found
          </p>
          <p
            style={{
              fontFamily: 'var(--font-montserrat)',
              fontWeight: 200,
              fontSize: 13,
              color: 'rgba(245, 240, 232, 0.4)',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            This link may be invalid or expired. Check your email for the correct link.
          </p>
        </div>
      </div>
    )
  }

  /* ── Loading (no data yet or pending) ──────────────────────────── */
  // RENDERS_ENABLED: re-enable when Replicate integration is restored (Phase X)
  if (!data || (RENDERS_ENABLED && data.submission.render_status === 'pending')) {
    const designerName = data?.designer?.name ?? ''
    return (
      <div style={bgStyle} className="flex items-center justify-center px-4 py-16">
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          {designerName && (
            <h1
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: 28,
                fontWeight: 400,
                color: '#F5F0E8',
                letterSpacing: '0.02em',
                marginBottom: 32,
              }}
            >
              {designerName}
            </h1>
          )}
          <PulseLine />
          <p
            style={{
              fontFamily: 'var(--font-montserrat)',
              fontWeight: 200,
              fontSize: 13,
              color: 'rgba(245, 240, 232, 0.45)',
              marginTop: 28,
              lineHeight: 1.7,
              letterSpacing: '0.03em',
            }}
          >
            Your concept is being prepared — this takes about a minute.
          </p>
        </div>
      </div>
    )
  }

  /* ── Failed ──────────────────────────────────────────────────── */
  // RENDERS_ENABLED: re-enable when Replicate integration is restored (Phase X)
  if (RENDERS_ENABLED && data.submission.render_status === 'failed') {
    const dn = data.designer?.name ?? 'The designer'
    return (
      <div style={bgStyle} className="flex items-center justify-center px-4 py-16">
        <div
          style={{
            background: '#111111',
            border: '1px solid rgba(201, 169, 110, 0.15)',
            borderRadius: 2,
            padding: '64px 48px',
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: 22,
              fontWeight: 400,
              color: '#F5F0E8',
              marginBottom: 16,
            }}
          >
            Something went wrong
          </p>
          <p
            style={{
              fontFamily: 'var(--font-montserrat)',
              fontWeight: 200,
              fontSize: 13,
              color: 'rgba(245, 240, 232, 0.5)',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            We had trouble generating your concept. {dn} has been notified and will be in touch directly.
          </p>
        </div>
      </div>
    )
  }

  /* ── Complete ────────────────────────────────────────────────── */
  const { submission, designer } = data
  const designerName = designer?.name ?? ''
  const studioName = designer?.studio_name || designerName
  const briefSections = submission.brief ? extractBriefSections(submission.brief) : []
  const renderUrls = submission.render_urls ?? []

  return (
    <div style={bgStyle} className="px-4 py-16">
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: 32,
              fontWeight: 400,
              color: '#F5F0E8',
              letterSpacing: '0.02em',
              margin: '0 0 8px',
            }}
          >
            {designerName}
          </h1>
          {studioName && studioName !== designerName && (
            <p
              style={{
                fontFamily: 'var(--font-montserrat)',
                fontWeight: 200,
                fontSize: 11,
                color: 'rgba(245, 240, 232, 0.4)',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                margin: '0 0 20px',
              }}
            >
              {studioName}
            </p>
          )}
          <hr style={{ border: 'none', borderTop: '1px solid rgba(201, 169, 110, 0.2)', width: 40, margin: '20px auto 24px' }} />
          <p
            style={{
              fontFamily: 'var(--font-montserrat)',
              fontWeight: 200,
              fontSize: 13,
              color: 'rgba(245, 240, 232, 0.4)',
              letterSpacing: '0.04em',
              margin: 0,
            }}
          >
            Your concept for {submission.room_type}, styled in {submission.design_style}
          </p>
        </div>

        {/* Image grid — RENDERS_ENABLED: re-enable when Replicate integration is restored (Phase X) */}
        {RENDERS_ENABLED && renderUrls.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
              marginBottom: 48,
            }}
          >
            {renderUrls.map((url, i) => (
              <div
                key={i}
                style={{ position: 'relative', cursor: 'zoom-in' }}
                onClick={() => setLightboxUrl(url)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Concept ${i + 1}`}
                  style={{
                    width: '100%',
                    display: 'block',
                    border: '1px solid rgba(201, 169, 110, 0.2)',
                    borderRadius: 2,
                  }}
                />
              </div>
            ))}
          </div>
        )}
        {!RENDERS_ENABLED && (
          <div style={{ background: '#111111', border: '1px solid rgba(201,169,110,0.15)', borderRadius: 2, padding: '40px 32px', textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 400, color: 'rgba(245,240,232,0.5)', margin: '0 0 10px' }}>Concept renders</p>
            <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 12, color: 'rgba(245,240,232,0.3)', letterSpacing: '0.08em', margin: 0 }}>This feature is coming soon.</p>
          </div>
        )}

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid rgba(201, 169, 110, 0.15)', marginBottom: 48 }} />

        {/* Brief sections 1 & 2 */}
        {briefSections.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <p
              style={{
                fontSize: 9,
                fontWeight: 300,
                letterSpacing: '0.2em',
                color: 'rgba(201, 169, 110, 0.7)',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-montserrat)',
                marginBottom: 24,
              }}
            >
              Project overview
            </p>
            {briefSections.map((section, i) => (
              <div key={i} style={{ marginBottom: 28 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-montserrat)',
                    fontSize: 10,
                    fontWeight: 300,
                    letterSpacing: '0.14em',
                    color: 'rgba(245, 240, 232, 0.5)',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  {section.label}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-montserrat)',
                    fontWeight: 200,
                    fontSize: 13,
                    color: 'rgba(245, 240, 232, 0.6)',
                    lineHeight: 1.8,
                    margin: 0,
                  }}
                >
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
            style={{
              display: 'block',
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
              cursor: 'pointer',
              textAlign: 'center',
              fontFamily: 'var(--font-montserrat)',
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            I love this — book a call with {designerName}
          </a>
        )}

      </div>
    </div>
  )
}
