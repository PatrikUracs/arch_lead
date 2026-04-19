'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { RENDERS_ENABLED } from '@/lib/flags'

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function qualityBadge(quality: string | null): React.CSSProperties & { label: string } {
  switch (quality) {
    case 'High': return { label: 'High', background: 'rgba(138,158,140,0.2)', color: '#8A9E8C' }
    case 'Medium': return { label: 'Medium', background: 'rgba(201,169,110,0.15)', color: '#C9A96E' }
    case 'Low': return { label: 'Low', background: 'rgba(192,97,74,0.15)', color: '#C0614A' }
    default: return { label: '—', background: 'rgba(255,255,255,0.05)', color: 'rgba(245,240,232,0.3)' }
  }
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: '#111111', border: '1px solid rgba(201,169,110,0.15)', borderRadius: 2, padding: '24px 28px' }}>
      <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', color: 'rgba(201,169,110,0.7)', textTransform: 'uppercase', margin: '0 0 10px' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 36, fontWeight: 400, color: '#F5F0E8', margin: 0, lineHeight: 1 }}>{value}</p>
    </div>
  )
}

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#111111', border: '1px solid rgba(201,169,110,0.2)', borderRadius: 2, maxWidth: 640, width: '100%', maxHeight: '80vh', overflow: 'auto', padding: '40px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: 'rgba(245,240,232,0.4)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  )
}

function BriefModal({ brief, onClose }: { brief: string; onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <p style={{ fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', color: 'rgba(201,169,110,0.7)', textTransform: 'uppercase', fontFamily: 'var(--font-montserrat)', marginBottom: 20 }}>AI Brief</p>
      <pre style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 13, color: 'rgba(245,240,232,0.75)', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{brief}</pre>
    </ModalOverlay>
  )
}

function ResponseModal({ sub, onClose }: { sub: Submission; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const draft = sub.ai_response_draft
  const subject = sub.ai_response_subject ?? ''

  function openInEmailClient() {
    window.open(`mailto:${encodeURIComponent(sub.client_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft ?? '')}`)
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(draft ?? '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 400, color: '#F5F0E8', marginBottom: 24, letterSpacing: '0.02em' }}>Draft response to {sub.client_name}</p>
      <div style={{ background: '#1A1A1A', border: '1px solid rgba(201,169,110,0.12)', borderRadius: 2, padding: '16px', fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 13, color: draft ? 'rgba(245,240,232,0.75)' : 'rgba(245,240,232,0.25)', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 20 }}>
        {draft ?? 'No draft available for this submission.'}
      </div>
      {draft && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button onClick={openInEmailClient} style={{ background: '#C9A96E', color: '#0A0A0A', border: 'none', borderRadius: 2, padding: '10px 20px', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 400, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}>Open in email client</button>
            <button onClick={copyToClipboard} style={{ background: 'transparent', border: '1px solid #C9A96E', color: '#C9A96E', borderRadius: 2, padding: '10px 20px', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 400, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {copied ? (<><svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 7L5.5 10.5L12 4" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Copied</>) : 'Copy to clipboard'}
            </button>
          </div>
          <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 11, color: 'rgba(245,240,232,0.25)', margin: 0 }}>This is an AI-drafted starting point. Edit as needed before sending.</p>
        </>
      )}
    </ModalOverlay>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }
  return (
    <button onClick={copy} style={{ background: 'transparent', border: '1px solid rgba(201,169,110,0.4)', color: copied ? '#8A9E8C' : '#C9A96E', borderRadius: 2, padding: '6px 12px', fontFamily: 'var(--font-montserrat)', fontSize: 9, fontWeight: 400, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function PasswordScreen({ slug, onSuccess }: { slug: string; onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/dashboard-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, slug }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      sessionStorage.setItem(`designlead_auth_${slug}`, 'true')
      sessionStorage.setItem(`designlead_pw_${slug}`, password)
      onSuccess()
    } else {
      setError('Incorrect password')
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
  }

  return (
    <>
      <style>{`@keyframes dl-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}.dl-shake{animation:dl-shake 0.5s ease}`}</style>
      <div style={{ background: 'radial-gradient(ellipse at center, #141414 0%, #0A0A0A 70%)', minHeight: '100vh' }} className="flex items-center justify-center px-4 py-16">
        <div style={{ background: '#111111', border: '1px solid rgba(201,169,110,0.4)', borderRadius: 2, boxShadow: '0 0 80px rgba(201,169,110,0.04), 0 4px 60px rgba(0,0,0,0.6)', width: '100%', maxWidth: 400, padding: '48px' }}>
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 400, color: '#F5F0E8', margin: '0 0 8px', letterSpacing: '0.02em' }}>Studio dashboard</h1>
          <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, color: 'rgba(245,240,232,0.4)', letterSpacing: '0.12em', marginBottom: 32 }}>Enter your password to continue</p>
          <form onSubmit={handleSubmit} noValidate>
            <div className={shake ? 'dl-shake' : ''}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="form-input" style={{ marginBottom: 8 }} autoFocus />
              {error && <p style={{ color: '#C0614A', fontSize: 12, fontFamily: 'var(--font-montserrat)', fontWeight: 200, marginBottom: 12 }}>{error}</p>}
            </div>
            <button type="submit" disabled={loading || !password} style={{ width: '100%', background: '#C9A96E', color: '#0A0A0A', fontWeight: 400, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, padding: '14px 24px', border: 'none', cursor: loading || !password ? 'not-allowed' : 'pointer', opacity: loading || !password ? 0.6 : 1, fontFamily: 'var(--font-montserrat)', marginTop: 8 }}>
              {loading ? '...' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

function NotFound() {
  return (
    <div style={{ background: 'radial-gradient(ellipse at center, #141414 0%, #0A0A0A 70%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 48, fontWeight: 400, color: 'rgba(201,169,110,0.3)', margin: '0 0 16px' }}>404</p>
        <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 13, fontWeight: 200, color: 'rgba(245,240,232,0.35)', letterSpacing: '0.1em' }}>This dashboard does not exist.</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug ?? ''

  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [previewDesignerName, setPreviewDesignerName] = useState('')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [designer, setDesigner] = useState<Designer | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [briefModal, setBriefModal] = useState<string | null>(null)
  const [responseModal, setResponseModal] = useState<Submission | null>(null)
  const [checkmarks, setCheckmarks] = useState<Record<string, boolean>>({})
  const [notifPref, setNotifPref] = useState<'instant' | 'digest'>('instant')
  const [scrapeLoading, setScrapeLoading] = useState(false)

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const intakeUrl = `${appUrl}/a/${slug}`
  const dashboardUrl = `${appUrl}/dashboard/${slug}`
  const iframeSnippet = `<iframe src="${appUrl}/a/${slug}/embed" width="100%" height="900" frameborder="0" scrolling="auto" style="border:none;"></iframe>`

  useEffect(() => {
    if (!slug) { setChecking(false); return }

    const searchParams = new URLSearchParams(window.location.search)
    const previewToken = searchParams.get('preview')

    if (previewToken) {
      fetch(`/api/admin/preview-validate?token=${previewToken}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.valid) {
            setPreviewMode(true)
            setPreviewDesignerName(data.designer_name ?? '')
            setAuthed(true)
          } else {
            setChecking(false)
          }
        })
        .catch(() => setChecking(false))
        .finally(() => setChecking(false))
      return
    }

    const ok = sessionStorage.getItem(`designlead_auth_${slug}`) === 'true'
    setAuthed(ok)
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

  useEffect(() => {
    if (authed) loadData()
  }, [authed, loadData])

  function logout() {
    sessionStorage.removeItem(`designlead_auth_${slug}`)
    sessionStorage.removeItem(`designlead_pw_${slug}`)
    window.location.reload()
  }

  async function updateStatus(id: string, newStatus: string) {
    const res = await fetch(`/api/submissions/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
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

  if (checking) return null
  if (notFound) return <NotFound />
  if (!authed) return <PasswordScreen slug={slug} onSuccess={() => setAuthed(true)} />

  const total = submissions.length
  const highQuality = submissions.filter((s) => s.lead_quality === 'High').length
  const rendered = submissions.filter((s) => s.render_status === 'complete').length
  const converted = submissions.filter((s) => s.status === 'Converted').length
  const convRate = total > 0 ? Math.round((converted / total) * 100) + '%' : '—'
  const studioName = designer?.studio_name || designer?.name || ''

  const labelStyle: React.CSSProperties = { fontFamily: 'var(--font-montserrat)', fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', color: 'rgba(201,169,110,0.7)', textTransform: 'uppercase' }
  const tdStyle: React.CSSProperties = { fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 12, color: 'rgba(245,240,232,0.65)', padding: '14px 12px', borderBottom: '1px solid rgba(201,169,110,0.06)', verticalAlign: 'middle' }
  const thStyle: React.CSSProperties = { ...labelStyle, padding: '10px 12px', textAlign: 'left' as const, borderBottom: '1px solid rgba(201,169,110,0.12)' }

  return (
    <>
      <style>{`@keyframes dl-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}`}</style>

      {briefModal && <BriefModal brief={briefModal} onClose={() => setBriefModal(null)} />}
      {responseModal && <ResponseModal sub={responseModal} onClose={() => setResponseModal(null)} />}

      {previewMode && (
        <div style={{ background: 'rgba(201,169,110,0.12)', borderBottom: '1px solid rgba(201,169,110,0.4)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 400, letterSpacing: '0.2em', color: '#C9A96E', textTransform: 'uppercase' }}>
            READ-ONLY ADMIN PREVIEW{previewDesignerName ? ` — ${previewDesignerName}` : ''}
          </span>
        </div>
      )}

      <div style={{ background: 'radial-gradient(ellipse at center, #141414 0%, #0A0A0A 70%)', minHeight: '100vh', padding: '40px 24px 80px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 400, color: '#F5F0E8', margin: '0 0 6px', letterSpacing: '0.02em' }}>Studio dashboard</h1>
              {studioName && <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 12, color: 'rgba(245,240,232,0.35)', letterSpacing: '0.1em', margin: 0 }}>{studioName}</p>}
            </div>
            {!previewMode && (
              <button onClick={logout} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.14em', color: 'rgba(245,240,232,0.3)', cursor: 'pointer', textTransform: 'uppercase', padding: 0 }}>
                Log out
              </button>
            )}
          </div>

          {loadingData ? (
            <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 13, color: 'rgba(245,240,232,0.3)' }}>Loading…</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 40 }}>
                <MetricCard label="Total leads" value={total} />
                <MetricCard label="High quality" value={highQuality} />
                {/* RENDERS_ENABLED: re-enable when Replicate integration is restored (Phase X) */}
                {RENDERS_ENABLED && <MetricCard label="Renders generated" value={rendered} />}
                <MetricCard label="Conversion rate" value={convRate} />
              </div>

              <div style={{ background: '#111111', border: '1px solid rgba(201,169,110,0.15)', borderRadius: 2, overflow: 'auto', marginBottom: 48 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Client</th>
                      <th style={thStyle}>Room</th>
                      <th style={thStyle}>Budget</th>
                      <th style={thStyle}>Quality</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.length === 0 ? (
                      <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'rgba(245,240,232,0.2)', padding: '40px' }}>No submissions yet</td></tr>
                    ) : (
                      submissions.map((sub) => {
                        const badge = qualityBadge(sub.lead_quality)
                        return (
                          <tr key={sub.id}>
                            <td style={tdStyle}>{formatDate(sub.created_at)}</td>
                            <td style={tdStyle}>
                              <span>{sub.client_name}</span><br />
                              <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.3)' }}>{sub.client_email}</span>
                            </td>
                            <td style={tdStyle}>{sub.room_type}</td>
                            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{sub.budget_range}</td>
                            <td style={tdStyle}>
                              <span style={{ background: badge.background, color: badge.color, borderRadius: 20, padding: '3px 10px', fontSize: 9, fontFamily: 'var(--font-montserrat)', fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{badge.label}</span>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <select value={sub.status} onChange={(e) => !previewMode && updateStatus(sub.id, e.target.value)} disabled={previewMode}
                                  style={{ background: '#1A1A1A', border: '1px solid rgba(201,169,110,0.15)', borderRadius: 2, color: 'rgba(245,240,232,0.6)', fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 11, padding: '4px 8px', cursor: previewMode ? 'not-allowed' : 'pointer', opacity: previewMode ? 0.5 : 1 }}>
                                  {['New', 'Contacted', 'Converted', 'Not a fit'].map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                {checkmarks[sub.id] && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7L5.5 10.5L12 4" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                              </div>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                {sub.brief && <button onClick={() => setBriefModal(sub.brief!)} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.1em', color: 'rgba(201,169,110,0.7)', cursor: 'pointer', textTransform: 'uppercase', padding: 0, textDecoration: 'underline' }}>View brief</button>}
                                {/* RENDERS_ENABLED: re-enable when Replicate integration is restored (Phase X) */}
                                {RENDERS_ENABLED && sub.render_status === 'complete' && sub.results_page_token && (
                                  <a href={`/results/${sub.results_page_token}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.1em', color: 'rgba(201,169,110,0.7)', textTransform: 'uppercase', textDecoration: 'underline' }}>View results</a>
                                )}
                                {!previewMode && <button onClick={() => setResponseModal(sub)} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.1em', color: 'rgba(201,169,110,0.7)', cursor: 'pointer', textTransform: 'uppercase', padding: 0, textDecoration: 'underline' }}>Draft response</button>}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {!previewMode && (
                <>
                  {/* Share & Embed */}
                  <div style={{ marginBottom: 48 }}>
                    <p style={{ ...labelStyle, marginBottom: 20 }}>Share & embed</p>
                    <div style={{ background: '#111111', border: '1px solid rgba(201,169,110,0.15)', borderRadius: 2, padding: '24px 28px', maxWidth: 620 }}>
                      <div style={{ marginBottom: 20 }}>
                        <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.12em', color: 'rgba(245,240,232,0.5)', textTransform: 'uppercase', margin: '0 0 8px' }}>Client intake link</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ background: '#1A1A1A', border: '1px solid rgba(201,169,110,0.12)', borderRadius: 2, padding: '9px 12px', flex: 1, overflow: 'hidden' }}>
                            <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, color: '#F5F0E8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{intakeUrl}</span>
                          </div>
                          <CopyButton value={intakeUrl} />
                        </div>
                        <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, color: 'rgba(245,240,232,0.25)', marginTop: 6 }}>Share this link with clients to send them to your intake form.</p>
                      </div>
                      <div style={{ marginBottom: 20 }}>
                        <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.12em', color: 'rgba(245,240,232,0.5)', textTransform: 'uppercase', margin: '0 0 8px' }}>Dashboard link</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ background: '#1A1A1A', border: '1px solid rgba(201,169,110,0.12)', borderRadius: 2, padding: '9px 12px', flex: 1, overflow: 'hidden' }}>
                            <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, color: '#F5F0E8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{dashboardUrl}</span>
                          </div>
                          <CopyButton value={dashboardUrl} />
                        </div>
                      </div>
                      <div>
                        <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.12em', color: 'rgba(245,240,232,0.5)', textTransform: 'uppercase', margin: '0 0 8px' }}>Embed on your website</p>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ background: '#1A1A1A', border: '1px solid rgba(201,169,110,0.12)', borderRadius: 2, padding: '9px 12px', flex: 1, overflow: 'hidden' }}>
                            <code style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(245,240,232,0.6)', wordBreak: 'break-all', display: 'block' }}>{iframeSnippet}</code>
                          </div>
                          <CopyButton value={iframeSnippet} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Email notification preference */}
                  <div style={{ marginBottom: 48 }}>
                    <p style={{ ...labelStyle, marginBottom: 20 }}>Email notifications</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 480 }}>
                      {[
                        { value: 'instant' as const, label: 'Instant', desc: 'Receive an email for each new lead' },
                        { value: 'digest' as const, label: 'Daily digest', desc: 'Receive one summary email each morning' },
                      ].map((opt) => {
                        const checked = notifPref === opt.value
                        return (
                          <label key={opt.value} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', padding: '11px 14px', borderRadius: 2, border: `1px solid ${checked ? '#C9A96E' : 'rgba(201,169,110,0.12)'}`, background: checked ? 'rgba(201,169,110,0.06)' : 'transparent', transition: 'all 0.2s ease' }}>
                            <input type="radio" name="notifPref" value={opt.value} checked={checked} onChange={() => updateNotifPref(opt.value)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                            <div>
                              <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 13, fontWeight: 200, color: checked ? '#F5F0E8' : 'rgba(245,240,232,0.65)', display: 'block' }}>{opt.label}</span>
                              <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, color: 'rgba(245,240,232,0.3)' }}>{opt.desc}</span>
                            </div>
                            <span style={{ width: 6, height: 6, minWidth: 6, borderRadius: '50%', border: `1px solid ${checked ? '#C9A96E' : 'rgba(201,169,110,0.3)'}`, background: checked ? '#C9A96E' : 'transparent', flexShrink: 0, transition: 'all 0.2s ease' }} />
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Style profile */}
                  <div>
                    <p style={{ ...labelStyle, marginBottom: 20 }}>Style profile</p>
                    {designer?.ai_style_profile ? (
                      <div style={{ background: '#1A1A1A', border: '1px solid rgba(201,169,110,0.15)', borderRadius: 2, padding: '14px', color: 'rgba(245,240,232,0.45)', fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 12, lineHeight: 1.7, marginBottom: 12, maxWidth: 480 }}>
                        <p style={{ ...labelStyle, marginBottom: 8 }}>Detected from your portfolio</p>
                        {designer.ai_style_profile}
                      </div>
                    ) : (
                      <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 12, color: 'rgba(245,240,232,0.3)', marginBottom: 12 }}>
                        {designer?.portfolio_scrape_status === 'failed' ? 'Style profile detection failed.' : 'No style profile detected yet.'}
                      </p>
                    )}
                    <button onClick={refreshStyleProfile} disabled={scrapeLoading}
                      style={{ background: 'transparent', border: '1px solid #C9A96E', color: '#C9A96E', borderRadius: 2, padding: '10px 20px', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 400, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: scrapeLoading ? 'not-allowed' : 'pointer', opacity: scrapeLoading ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {scrapeLoading ? (<><span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" /></>) : 'Refresh style profile'}
                    </button>
                    <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 11, color: 'rgba(245,240,232,0.25)', marginTop: 10, maxWidth: 480 }}>
                      This re-reads your portfolio URL and updates the style signature used to generate client renders.
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
