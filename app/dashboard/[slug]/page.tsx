'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { RENDERS_ENABLED } from '@/lib/flags'

/* ── CSS tokens ──────────────────────────────────────────────────── */
const T = {
  bgPage:       '#0F0D0A',
  bgCard:       '#181510',
  bgElevated:   '#1A1710',
  accent:       '#B8935A',
  accentDim:    'rgba(184,147,90,0.3)',
  accentSubtle: 'rgba(184,147,90,0.12)',
  textPrimary:  '#EDE5D0',
  textMuted:    'rgba(237,229,208,0.35)',
  borderDefault:'rgba(255,255,255,0.05)',
  borderAccent: 'rgba(184,147,90,0.2)',
}

/* ── Types ───────────────────────────────────────────────────────── */
type Submission = {
  id: string
  created_at: string
  client_name: string
  client_email: string
  room_type: string
  budget_range: string
  lead_quality: string | null
  status: string
  render_status: string
  results_page_token: string | null
  brief: string | null
  ai_response_draft: string | null
  ai_response_subject: string | null
}

type Designer = {
  name: string
  studio_name: string | null
  notification_preference: string
  ai_style_profile: string | null
  portfolio_scrape_status: string | null
}

type QualityFilter = 'all' | 'High' | 'Medium' | 'Low'
type SortOrder    = 'newest' | 'oldest' | 'quality'

/* ── Helpers ─────────────────────────────────────────────────────── */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('hu-HU', { day: 'numeric', month: 'short', year: '2-digit' })
}

function qualityLeftBorder(quality: string | null): string {
  if (quality === 'High')   return `2px solid ${T.accent}`
  if (quality === 'Medium') return `2px solid ${T.accentDim}`
  return '2px solid transparent'
}

function qualityChip(quality: string | null): { label: string; bg: string; color: string } {
  switch (quality) {
    case 'High':   return { label: 'Magas',    bg: 'rgba(138,158,140,0.2)',  color: '#8A9E8C' }
    case 'Medium': return { label: 'Közepes',  bg: T.accentSubtle,           color: T.accent  }
    case 'Low':    return { label: 'Alacsony', bg: 'rgba(192,97,74,0.15)',   color: '#C0614A' }
    default:       return { label: '—',        bg: T.borderDefault,          color: T.textMuted }
  }
}

const QUALITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-montserrat)', fontSize: 9, fontWeight: 300,
  letterSpacing: '0.2em', color: 'rgba(184,147,90,0.7)', textTransform: 'uppercase',
}

/* ── Section header with gradient rule ──────────────────────────── */
function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ ...labelStyle, margin: '0 0 10px' }}>{label}</p>
      <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(184,147,90,0.4) 0%, transparent 70%)' }} />
    </div>
  )
}

/* ── Stat card ───────────────────────────────────────────────────── */
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.borderAccent}`, borderRadius: 6, padding: '24px 28px' }}>
      <p style={{ ...labelStyle, margin: '0 0 10px' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 36, fontWeight: 400, color: T.textPrimary, margin: 0, lineHeight: 1 }}>{value}</p>
    </div>
  )
}

/* ── Modal overlay ───────────────────────────────────────────────── */
function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: T.bgCard, border: `1px solid ${T.borderAccent}`, borderRadius: 6, maxWidth: 640, width: '100%', maxHeight: '80vh', overflow: 'auto', padding: '40px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: T.textMuted, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  )
}

function BriefModal({ brief, onClose }: { brief: string; onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <p style={{ ...labelStyle, marginBottom: 20 }}>AI Brief</p>
      <pre style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 13, color: 'rgba(237,229,208,0.75)', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{brief}</pre>
    </ModalOverlay>
  )
}

function ResponseModal({ sub, onClose }: { sub: Submission; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const draft   = sub.ai_response_draft
  const subject = sub.ai_response_subject ?? ''

  function openInEmailClient() {
    window.open(`mailto:${encodeURIComponent(sub.client_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft ?? '')}`)
  }
  async function copyToClipboard() {
    try { await navigator.clipboard.writeText(draft ?? ''); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 400, color: T.textPrimary, marginBottom: 24, letterSpacing: '0.02em' }}>
        Válaszvázlat — {sub.client_name}
      </p>
      <div style={{ background: T.bgElevated, border: `1px solid ${T.borderDefault}`, borderRadius: 2, padding: '16px', fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 13, color: draft ? 'rgba(237,229,208,0.75)' : T.textMuted, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 20 }}>
        {draft ?? 'Ehhez a beküldéshez nincs elérhető vázlat.'}
      </div>
      {draft && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button onClick={openInEmailClient} style={{ background: T.accent, color: T.bgPage, border: 'none', borderRadius: 2, padding: '10px 20px', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 400, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Megnyitás levelezőben
            </button>
            <button onClick={copyToClipboard} style={{ background: 'transparent', border: `1px solid ${T.accent}`, color: T.accent, borderRadius: 2, padding: '10px 20px', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 400, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {copied ? (<><svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 7L5.5 10.5L12 4" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Másolva</>) : 'Másolás'}
            </button>
          </div>
          <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 11, color: T.textMuted, margin: 0 }}>
            AI által generált kiindulópont — szerkeszd küldés előtt.
          </p>
        </>
      )}
    </ModalOverlay>
  )
}

/* ── Copy button ─────────────────────────────────────────────────── */
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }
  return (
    <button onClick={copy} style={{ background: 'transparent', border: `1px solid ${T.accentDim}`, color: copied ? '#8A9E8C' : T.accent, borderRadius: 2, padding: '6px 12px', fontFamily: 'var(--font-montserrat)', fontSize: 9, fontWeight: 400, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', transition: 'all 0.2s ease' }}>
      {copied ? 'Másolva' : 'Másolás'}
    </button>
  )
}

/* ── Password screen ─────────────────────────────────────────────── */
function PasswordScreen({ slug, onSuccess }: { slug: string; onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [shake, setShake]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res  = await fetch('/api/dashboard-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, slug }) })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      sessionStorage.setItem(`designlead_auth_${slug}`, 'true')
      sessionStorage.setItem(`designlead_pw_${slug}`, password)
      onSuccess()
    } else {
      setError('Hibás jelszó')
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
  }

  return (
    <>
      <style>{`@keyframes dl-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}.dl-shake{animation:dl-shake 0.5s ease}`}</style>
      <div style={{ background: `radial-gradient(ellipse at center, #181510 0%, ${T.bgPage} 70%)`, minHeight: '100vh' }} className="flex items-center justify-center px-4 py-16">
        <div style={{ background: T.bgCard, border: `1px solid ${T.borderAccent}`, borderRadius: 6, width: '100%', maxWidth: 400, padding: '48px' }}>
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 400, color: T.textPrimary, margin: '0 0 8px', letterSpacing: '0.02em' }}>Stúdió dashboard</h1>
          <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, color: T.textMuted, letterSpacing: '0.12em', marginBottom: 32 }}>Add meg a jelszódat a folytatáshoz</p>
          <form onSubmit={handleSubmit} noValidate>
            <div className={shake ? 'dl-shake' : ''}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Jelszó" className="form-input" style={{ marginBottom: 8 }} autoFocus />
              {error && <p style={{ color: '#C0614A', fontSize: 12, fontFamily: 'var(--font-montserrat)', fontWeight: 200, marginBottom: 12 }}>{error}</p>}
            </div>
            <button type="submit" disabled={loading || !password} style={{ width: '100%', background: T.accent, color: T.bgPage, fontWeight: 400, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, padding: '14px 24px', border: 'none', cursor: loading || !password ? 'not-allowed' : 'pointer', opacity: loading || !password ? 0.6 : 1, fontFamily: 'var(--font-montserrat)', marginTop: 8 }}>
              {loading ? '...' : 'Belépés'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

/* ── Not found ───────────────────────────────────────────────────── */
function NotFound() {
  return (
    <div style={{ background: `radial-gradient(ellipse at center, #181510 0%, ${T.bgPage} 70%)`, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 48, fontWeight: 400, color: T.accentDim, margin: '0 0 16px' }}>404</p>
        <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 13, fontWeight: 200, color: T.textMuted, letterSpacing: '0.1em' }}>Ez a dashboard nem létezik.</p>
      </div>
    </div>
  )
}

/* ── Lead card ───────────────────────────────────────────────────── */
function LeadCard({
  sub, expanded, onToggle, onBrief, onResponse, onStatusChange, previewMode, checkmark,
}: {
  sub: Submission
  expanded: boolean
  onToggle: () => void
  onBrief: () => void
  onResponse: () => void
  onStatusChange: (id: string, status: string) => void
  previewMode: boolean
  checkmark: boolean
}) {
  const chip   = qualityChip(sub.lead_quality)
  const border = qualityLeftBorder(sub.lead_quality)

  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.borderAccent}`, borderLeft: border, borderRadius: 6, overflow: 'hidden', transition: 'border-color 0.2s ease' }}>

      <button
        type="button"
        onClick={onToggle}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left' }}
      >
        <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, color: T.textMuted, letterSpacing: '0.06em', minWidth: 72, flexShrink: 0 }}>
          {formatDate(sub.created_at)}
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 13, fontWeight: 200, color: T.textPrimary, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sub.client_name}
          </span>
          <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, color: T.textMuted, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sub.client_email}
          </span>
        </span>

        <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, color: 'rgba(237,229,208,0.45)', flexShrink: 0 }}>
          {sub.room_type}
        </span>

        <span style={{ background: chip.bg, color: chip.color, borderRadius: 2, padding: '3px 10px', fontSize: 9, fontFamily: 'var(--font-montserrat)', fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {chip.label}
        </span>

        <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, color: T.textMuted, flexShrink: 0, letterSpacing: '0.06em' }}>
          {sub.status}
        </span>

        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', opacity: 0.4 }}>
          <path d="M2 4.5L6 8.5L10 4.5" stroke={T.textPrimary} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && (
        <div style={{ borderTop: `1px solid ${T.borderDefault}`, padding: '16px 20px 20px', animation: 'dl-fade-in 0.2s ease both' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 28px', marginBottom: 16 }}>
            <div>
              <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 9, fontWeight: 300, letterSpacing: '0.16em', color: T.textMuted, textTransform: 'uppercase' }}>Büdzsé</span>
              <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, color: 'rgba(237,229,208,0.7)', margin: '3px 0 0' }}>{sub.budget_range}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={sub.status}
                onChange={(e) => !previewMode && onStatusChange(sub.id, e.target.value)}
                disabled={previewMode}
                style={{ background: T.bgElevated, border: `1px solid ${T.borderAccent}`, borderRadius: 2, color: 'rgba(237,229,208,0.6)', fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 11, padding: '6px 10px', cursor: previewMode ? 'not-allowed' : 'pointer', opacity: previewMode ? 0.5 : 1 }}
              >
                {['New', 'Contacted', 'Converted', 'Not a fit'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {checkmark && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L5.5 10.5L12 4" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            <div style={{ height: 16, width: 1, background: T.borderDefault }} />

            {sub.brief && (
              <button onClick={onBrief} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.1em', color: 'rgba(184,147,90,0.7)', cursor: 'pointer', textTransform: 'uppercase', padding: 0, textDecoration: 'underline' }}>
                AI brief
              </button>
            )}
            {/* RENDERS_ENABLED: re-enable when Replicate integration is restored (Phase X) */}
            {RENDERS_ENABLED && sub.render_status === 'complete' && sub.results_page_token && (
              <a href={`/results/${sub.results_page_token}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.1em', color: 'rgba(184,147,90,0.7)', textTransform: 'uppercase', textDecoration: 'underline' }}>
                Eredmények
              </a>
            )}
            {!previewMode && (
              <button onClick={onResponse} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.1em', color: 'rgba(184,147,90,0.7)', cursor: 'pointer', textTransform: 'uppercase', padding: 0, textDecoration: 'underline' }}>
                Válaszvázlat
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Filter / sort bar ───────────────────────────────────────────── */
function FilterBar({ filter, sort, onFilter, onSort }: { filter: QualityFilter; sort: SortOrder; onFilter: (f: QualityFilter) => void; onSort: (s: SortOrder) => void }) {
  const pill = (active: boolean): React.CSSProperties => ({
    background: active ? T.accentSubtle : 'transparent',
    border: `1px solid ${active ? T.accent : T.borderAccent}`,
    color: active ? T.accent : T.textMuted,
    borderRadius: 2, padding: '5px 12px',
    fontFamily: 'var(--font-montserrat)', fontSize: 9, fontWeight: 300,
    letterSpacing: '0.14em', textTransform: 'uppercase',
    cursor: 'pointer', transition: 'all 0.2s ease',
  })

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {([['all','Összes'],['High','Magas'],['Medium','Közepes'],['Low','Alacsony']] as [QualityFilter,string][]).map(([v,l]) => (
          <button key={v} type="button" onClick={() => onFilter(v)} style={pill(filter === v)}>{l}</button>
        ))}
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 9, fontWeight: 300, letterSpacing: '0.14em', color: T.textMuted, textTransform: 'uppercase', marginRight: 2 }}>Rendezés</span>
        {([['newest','Legújabb'],['oldest','Legrégebbi'],['quality','Minőség']] as [SortOrder,string][]).map(([v,l]) => (
          <button key={v} type="button" onClick={() => onSort(v)} style={pill(sort === v)}>{l}</button>
        ))}
      </div>
    </div>
  )
}

/* ── Empty state ─────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.borderAccent}`, borderRadius: 6, padding: '64px 32px', textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: `1px solid ${T.accentDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 4v10M4 9h10" stroke={T.accent} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
        </svg>
      </div>
      <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 400, color: 'rgba(237,229,208,0.35)', margin: '0 0 8px' }}>Még nincsenek leadjeid</p>
      <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, color: T.textMuted, lineHeight: 1.7, margin: 0 }}>
        Oszd meg az intake linkedet, és az első beküldések itt jelennek meg.
      </p>
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function DashboardPage() {
  const params = useParams<{ slug: string }>()
  const slug   = params?.slug ?? ''

  const [authed,   setAuthed]   = useState(false)
  const [checking, setChecking] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [previewDesignerName, setPreviewDesignerName] = useState('')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [designer,    setDesigner]    = useState<Designer | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [briefModal,    setBriefModal]    = useState<string | null>(null)
  const [responseModal, setResponseModal] = useState<Submission | null>(null)
  const [checkmarks,  setCheckmarks]  = useState<Record<string, boolean>>({})
  const [expanded,    setExpanded]    = useState<Set<string>>(new Set())
  const [notifPref,   setNotifPref]   = useState<'instant' | 'digest'>('instant')
  const [scrapeLoading, setScrapeLoading] = useState(false)
  const [filter, setFilter] = useState<QualityFilter>('all')
  const [sort,   setSort]   = useState<SortOrder>('newest')

  const appUrl        = typeof window !== 'undefined' ? window.location.origin : ''
  const intakeUrl     = `${appUrl}/a/${slug}`
  const dashboardUrl  = `${appUrl}/dashboard/${slug}`
  const iframeSnippet = `<iframe src="${appUrl}/a/${slug}/embed" width="100%" height="900" frameborder="0" scrolling="auto" style="border:none;"></iframe>`

  useEffect(() => {
    if (!slug) { setChecking(false); return }
    const searchParams = new URLSearchParams(window.location.search)
    const previewToken = searchParams.get('preview')
    if (previewToken) {
      fetch(`/api/admin/preview-validate?token=${previewToken}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.valid) { setPreviewMode(true); setPreviewDesignerName(data.designer_name ?? ''); setAuthed(true) }
          else setChecking(false)
        })
        .catch(() => setChecking(false))
        .finally(() => setChecking(false))
      return
    }
    setAuthed(sessionStorage.getItem(`designlead_auth_${slug}`) === 'true')
    setChecking(false)
  }, [slug])

  const loadData = useCallback(async () => {
    if (!slug) return
    setLoadingData(true)
    try {
      const res = await fetch(`/api/dashboard-data?slug=${encodeURIComponent(slug)}`)
      if (res.status === 404) { setNotFound(true); return }
      if (res.ok) {
        const json = await res.json()
        setSubmissions(json.submissions ?? [])
        setDesigner(json.designer ?? null)
        setNotifPref(json.designer?.notification_preference ?? 'instant')
      }
    } catch { /* ignore */ }
    setLoadingData(false)
  }, [slug])

  useEffect(() => { if (authed) loadData() }, [authed, loadData])

  function logout() {
    sessionStorage.removeItem(`designlead_auth_${slug}`)
    sessionStorage.removeItem(`designlead_pw_${slug}`)
    window.location.reload()
  }

  async function updateStatus(id: string, newStatus: string) {
    const res = await fetch(`/api/submissions/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
    if (res.ok) {
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)))
      setCheckmarks((prev) => ({ ...prev, [id]: true }))
      setTimeout(() => setCheckmarks((prev) => ({ ...prev, [id]: false })), 1500)
    }
  }

  async function refreshStyleProfile() {
    if (!slug) return
    setScrapeLoading(true)
    try {
      await fetch('/api/scrape-portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ designer_slug: slug }) })
      await loadData()
    } catch (err) { console.error('Refresh style profile failed:', err) }
    setScrapeLoading(false)
  }

  async function updateNotifPref(pref: 'instant' | 'digest') {
    setNotifPref(pref)
    const password = sessionStorage.getItem(`designlead_pw_${slug}`) ?? ''
    await fetch('/api/designer-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationPreference: pref, slug, password }) })
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (checking) return null
  if (notFound) return <NotFound />
  if (!authed)  return <PasswordScreen slug={slug} onSuccess={() => setAuthed(true)} />

  const total       = submissions.length
  const highQuality = submissions.filter((s) => s.lead_quality === 'High').length
  const rendered    = submissions.filter((s) => s.render_status === 'complete').length
  const converted   = submissions.filter((s) => s.status === 'Converted').length
  const convRate    = total > 0 ? Math.round((converted / total) * 100) + '%' : '—'
  const studioName  = designer?.studio_name || designer?.name || ''

  const visible = submissions
    .filter((s) => filter === 'all' || s.lead_quality === filter)
    .sort((a, b) => {
      if (sort === 'newest')  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sort === 'oldest')  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return (QUALITY_ORDER[a.lead_quality ?? ''] ?? 3) - (QUALITY_ORDER[b.lead_quality ?? ''] ?? 3)
    })

  return (
    <>
      <style>{`@keyframes dl-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}`}</style>

      {briefModal    && <BriefModal brief={briefModal} onClose={() => setBriefModal(null)} />}
      {responseModal && <ResponseModal sub={responseModal} onClose={() => setResponseModal(null)} />}

      {previewMode && (
        <div style={{ background: T.accentSubtle, borderBottom: `1px solid ${T.borderAccent}`, padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 400, letterSpacing: '0.2em', color: T.accent, textTransform: 'uppercase' }}>
            CSAK OLVASHATÓ ADMIN ELŐNÉZET{previewDesignerName ? ` — ${previewDesignerName}` : ''}
          </span>
        </div>
      )}

      <div style={{ background: `radial-gradient(ellipse at center, #181510 0%, ${T.bgPage} 70%)`, minHeight: '100vh', padding: '40px 24px 80px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 400, color: T.textPrimary, margin: '0 0 6px', letterSpacing: '0.02em' }}>Stúdió dashboard</h1>
              {studioName && <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 12, color: T.textMuted, letterSpacing: '0.1em', margin: 0 }}>{studioName}</p>}
            </div>
            {!previewMode && (
              <button onClick={logout} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.14em', color: T.textMuted, cursor: 'pointer', textTransform: 'uppercase', padding: 0 }}>
                Kilépés
              </button>
            )}
          </div>
          <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(184,147,90,0.4) 0%, transparent 70%)', marginBottom: 40 }} />

          {loadingData ? (
            <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 13, color: T.textMuted }}>Betöltés…</p>
          ) : (
            <>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 48 }}>
                <StatCard label="Összes lead"       value={total} />
                <StatCard label="Magas minőség"     value={highQuality} />
                {/* RENDERS_ENABLED: re-enable when Replicate integration is restored (Phase X) */}
                {RENDERS_ENABLED && <StatCard label="Generált renderek" value={rendered} />}
                <StatCard label="Konverziós arány"  value={convRate} />
              </div>

              {/* Leads */}
              <div style={{ marginBottom: 48 }}>
                <SectionHeader label="Leadek" />
                <FilterBar filter={filter} sort={sort} onFilter={setFilter} onSort={setSort} />

                {total === 0 ? (
                  <EmptyState />
                ) : visible.length === 0 ? (
                  <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, color: T.textMuted, padding: '24px 0' }}>
                    Nincs ilyen szűrésnek megfelelő lead.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {visible.map((sub) => (
                      <LeadCard
                        key={sub.id}
                        sub={sub}
                        expanded={expanded.has(sub.id)}
                        onToggle={() => toggleExpanded(sub.id)}
                        onBrief={() => setBriefModal(sub.brief!)}
                        onResponse={() => setResponseModal(sub)}
                        onStatusChange={updateStatus}
                        previewMode={previewMode}
                        checkmark={checkmarks[sub.id] ?? false}
                      />
                    ))}
                  </div>
                )}
              </div>

              {!previewMode && (
                <>
                  {/* Share & Embed */}
                  <div style={{ marginBottom: 48 }}>
                    <SectionHeader label="Megosztás és beágyazás" />
                    <div style={{ background: T.bgCard, border: `1px solid ${T.borderAccent}`, borderRadius: 6, padding: '24px 28px', maxWidth: 620 }}>
                      {([
                        { label: 'Ügyfél intake link', value: intakeUrl,    hint: 'Ezt a linket küldd az ügyfeleidnek az intake-formhoz.' },
                        { label: 'Dashboard link',      value: dashboardUrl, hint: null },
                      ] as { label: string; value: string; hint: string | null }[]).map((row) => (
                        <div key={row.label} style={{ marginBottom: 20 }}>
                          <p style={{ ...labelStyle, margin: '0 0 8px' }}>{row.label}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ background: T.bgElevated, border: `1px solid ${T.borderDefault}`, borderRadius: 2, padding: '9px 12px', flex: 1, overflow: 'hidden' }}>
                              <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{row.value}</span>
                            </div>
                            <CopyButton value={row.value} />
                          </div>
                          {row.hint && <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, color: T.textMuted, marginTop: 6 }}>{row.hint}</p>}
                        </div>
                      ))}
                      <div>
                        <p style={{ ...labelStyle, margin: '0 0 8px' }}>Beágyazás a weboldaladba</p>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ background: T.bgElevated, border: `1px solid ${T.borderDefault}`, borderRadius: 2, padding: '9px 12px', flex: 1, overflow: 'hidden' }}>
                            <code style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(237,229,208,0.6)', wordBreak: 'break-all', display: 'block' }}>{iframeSnippet}</code>
                          </div>
                          <CopyButton value={iframeSnippet} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Email notifications */}
                  <div style={{ marginBottom: 48 }}>
                    <SectionHeader label="E-mail értesítők" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480 }}>
                      {([
                        { value: 'instant' as const, label: 'Azonnali',          desc: 'Minden új leadnél kapsz e-mailt' },
                        { value: 'digest'  as const, label: 'Napi összefoglaló', desc: 'Reggel egy összefoglaló e-mail' },
                      ]).map((opt) => {
                        const checked = notifPref === opt.value
                        return (
                          <label key={opt.value} className={checked ? 'radio-option radio-option--checked' : 'radio-option'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', padding: '11px 14px', borderRadius: 2, border: `1px solid ${checked ? T.accent : T.borderAccent}`, background: checked ? T.accentSubtle : 'transparent', transition: 'all 0.2s ease' }}>
                            <input type="radio" name="notifPref" value={opt.value} checked={checked} onChange={() => updateNotifPref(opt.value)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                            <div>
                              <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 13, fontWeight: 200, color: checked ? T.textPrimary : 'rgba(237,229,208,0.65)', display: 'block' }}>{opt.label}</span>
                              <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, color: T.textMuted }}>{opt.desc}</span>
                            </div>
                            <span style={{ width: 6, height: 6, minWidth: 6, borderRadius: '50%', border: `1px solid ${checked ? T.accent : T.accentDim}`, background: checked ? T.accent : 'transparent', flexShrink: 0, transition: 'all 0.2s ease' }} />
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Style profile */}
                  <div>
                    <SectionHeader label="Stílusprofil" />
                    {designer?.ai_style_profile ? (
                      <div style={{ background: T.bgElevated, border: `1px solid ${T.borderAccent}`, borderRadius: 2, padding: '14px', color: 'rgba(237,229,208,0.45)', fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 12, lineHeight: 1.7, marginBottom: 12, maxWidth: 480 }}>
                        <p style={{ ...labelStyle, marginBottom: 8 }}>Portfólióból azonosítva</p>
                        {designer.ai_style_profile}
                      </div>
                    ) : (
                      <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 12, color: T.textMuted, marginBottom: 12 }}>
                        {designer?.portfolio_scrape_status === 'failed' ? 'A stílusprofil azonosítása sikertelen.' : 'Még nincs stílusprofil azonosítva.'}
                      </p>
                    )}
                    <button onClick={refreshStyleProfile} disabled={scrapeLoading} style={{ background: 'transparent', border: `1px solid ${T.accent}`, color: T.accent, borderRadius: 2, padding: '10px 20px', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 400, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: scrapeLoading ? 'not-allowed' : 'pointer', opacity: scrapeLoading ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {scrapeLoading
                        ? (<><span style={{ background: T.accent }} className="loading-dot" /><span style={{ background: T.accent }} className="loading-dot" /><span style={{ background: T.accent }} className="loading-dot" /></>)
                        : 'Stílusprofil frissítése'}
                    </button>
                    <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 11, color: T.textMuted, marginTop: 10, maxWidth: 480 }}>
                      Újraolvassa a portfólió URL-edet, és frissíti a stílusaláírást, amellyel az ügyfél renderek generálódnak.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
