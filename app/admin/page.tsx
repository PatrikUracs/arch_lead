'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

/* ── Types ──────────────────────────────────────────────────────── */
type ServiceStatus = { status: 'ok' | 'degraded' | 'failing'; label: string; detail?: string }
type HealthData = { services: Record<string, ServiceStatus> }

type Designer = {
  id: string
  slug: string
  name: string
  studio_name: string | null
  email: string | null
  is_paid: boolean
  notification_preference: string
  response_tone: string | null
  portfolio_url: string | null
  style_keywords: string[]
  typical_project_size: string | null
  rate_per_sqm: string | null
  bio: string | null
  calendly_url: string | null
  created_at: string
  archived_at: string | null
  portfolio_scrape_status: string | null
  submission_count: number
}

type Submission = {
  id: string
  created_at: string
  designer_slug: string
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
  archived_at: string | null
}

type Metrics = {
  total_designers: number
  submissions_this_week: number
  renders_this_week: number
  quality_breakdown: { high: number; medium: number; low: number }
}

type AdminAction = {
  id: string
  action_type: string
  details: Record<string, unknown>
  created_at: string
}

/* ── Constants ──────────────────────────────────────────────────── */
const ADMIN_KEY = 'designlead_admin_auth'

/* ── Helpers ────────────────────────────────────────────────────── */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function adminHeaders(adminPassword: string) {
  return { 'Content-Type': 'application/json', 'x-admin-auth': adminPassword }
}

/* ── Design tokens ──────────────────────────────────────────────── */
const GOLD = '#C9A96E'
const CARD_BG = '#111111'
const CARD_BORDER = 'rgba(201,169,110,0.4)'
const MUTED = 'rgba(245,240,232,0.45)'
const BODY = '#F5F0E8'
const INPUT_BG = '#1A1A1A'
const RED = '#C0614A'
const GREEN = '#8A9E8C'

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-montserrat)',
  fontSize: 9,
  fontWeight: 300,
  letterSpacing: '0.2em',
  color: 'rgba(201,169,110,0.7)',
  textTransform: 'uppercase',
}

const tdStyle: React.CSSProperties = {
  fontFamily: 'var(--font-montserrat)',
  fontWeight: 200,
  fontSize: 12,
  color: MUTED,
  padding: '12px 10px',
  borderBottom: '1px solid rgba(201,169,110,0.06)',
  verticalAlign: 'middle',
}

const thStyle: React.CSSProperties = {
  ...labelStyle,
  padding: '10px 10px',
  textAlign: 'left' as const,
  borderBottom: '1px solid rgba(201,169,110,0.12)',
}

/* ── Password screen ────────────────────────────────────────────── */
function AdminPasswordScreen({ onSuccess }: { onSuccess: (pw: string) => void }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      sessionStorage.setItem(ADMIN_KEY, 'true')
      onSuccess(password)
    } else {
      setError('Incorrect password')
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
  }

  return (
    <>
      <style>{`
        @keyframes dl-shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
        .dl-shake { animation: dl-shake 0.5s ease; }
      `}</style>
      <div style={{ background: 'radial-gradient(ellipse at center, #141414 0%, #0A0A0A 70%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 2, width: '100%', maxWidth: 380, padding: '48px' }}>
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 400, color: BODY, margin: '0 0 6px', letterSpacing: '0.02em' }}>
            Admin
          </h1>
          <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, color: MUTED, letterSpacing: '0.12em', marginBottom: 32 }}>
            DesignLead operator console
          </p>
          <form onSubmit={handleSubmit} noValidate>
            <div className={shake ? 'dl-shake' : ''}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                className="form-input"
                style={{ marginBottom: 8 }}
              />
              {error && <p style={{ color: RED, fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, margin: '0 0 12px' }}>{error}</p>}
            </div>
            <button
              type="submit"
              disabled={loading || !password}
              style={{ width: '100%', background: GOLD, color: '#0A0A0A', fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 400, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, padding: '14px', border: 'none', cursor: loading || !password ? 'not-allowed' : 'pointer', opacity: loading || !password ? 0.6 : 1 }}
            >
              {loading ? 'Verifying…' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

/* ── Metric card ────────────────────────────────────────────────── */
function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: CARD_BG, border: '1px solid rgba(201,169,110,0.15)', borderRadius: 2, padding: '22px 24px' }}>
      <p style={{ ...labelStyle, margin: '0 0 10px' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 32, fontWeight: 400, color: BODY, margin: 0, lineHeight: 1 }}>{value}</p>
    </div>
  )
}

/* ── Status dot ─────────────────────────────────────────────────── */
function StatusDot({ status }: { status: 'ok' | 'degraded' | 'failing' }) {
  const color = status === 'ok' ? GREEN : status === 'degraded' ? GOLD : RED
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
}

/* ── Health panel ───────────────────────────────────────────────── */
function AdminHealthPanel({ adminPassword }: { adminPassword: string }) {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/health', { headers: adminHeaders(adminPassword) })
      if (res.ok) setHealth(await res.json())
    } catch { /* non-fatal */ }
    setLoading(false)
  }, [adminPassword])

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  const services = [
    { key: 'resend', name: 'Resend' },
    { key: 'supabase', name: 'Supabase' },
    { key: 'anthropic', name: 'Anthropic' },
    { key: 'replicate', name: 'Replicate' },
    { key: 'cron', name: 'Vercel Cron' },
  ]

  return (
    <div style={{ background: CARD_BG, border: `1px solid rgba(201,169,110,0.15)`, borderRadius: 2, padding: '20px 24px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ ...labelStyle, margin: 0 }}>System health</p>
        {loading && <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 10, color: MUTED, letterSpacing: '0.1em' }}>Refreshing…</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {services.map(({ key, name }) => {
          const svc = health?.services[key]
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
              <StatusDot status={svc?.status ?? 'failing'} />
              <div>
                <p style={{ ...labelStyle, margin: 0, fontSize: 8 }}>{name}</p>
                <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, color: MUTED, margin: '2px 0 0' }}>
                  {svc ? svc.label : '—'}
                  {svc?.detail && <span style={{ color: 'rgba(245,240,232,0.25)', marginLeft: 4 }}>· {svc.detail}</span>}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Pill button ────────────────────────────────────────────────── */
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? GOLD : 'transparent',
        color: active ? '#0A0A0A' : GOLD,
        border: `1px solid ${GOLD}`,
        borderRadius: 20,
        padding: '4px 14px',
        fontFamily: 'var(--font-montserrat)',
        fontSize: 10,
        fontWeight: active ? 400 : 300,
        letterSpacing: '0.1em',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </button>
  )
}

/* ── Kebab menu ─────────────────────────────────────────────────── */
function KebabMenu({ items }: { items: { label: string; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p) }}
        style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 16, padding: '2px 6px', borderRadius: 2 }}
        title="Actions"
      >
        &#8942;
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 100,
          background: '#1A1A1A', border: `1px solid rgba(201,169,110,0.3)`, borderRadius: 2,
          minWidth: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          {items.map((item) => (
            <button
              key={item.label}
              onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick() }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'none', border: 'none', borderBottom: '1px solid rgba(201,169,110,0.06)',
                padding: '10px 14px', cursor: 'pointer',
                fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200,
                color: item.danger ? RED : BODY,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201,169,110,0.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Plan badge ─────────────────────────────────────────────────── */
function PlanBadge({ isPaid }: { isPaid: boolean }) {
  return (
    <span style={{
      border: `1px solid ${isPaid ? GOLD : 'rgba(245,240,232,0.2)'}`,
      color: isPaid ? GOLD : MUTED,
      borderRadius: 20,
      padding: '2px 10px',
      fontFamily: 'var(--font-montserrat)',
      fontSize: 9,
      fontWeight: 300,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {isPaid ? 'Pro' : 'Base'}
    </span>
  )
}

/* ── Inline editable field ──────────────────────────────────────── */
function InlineField({
  value,
  onSave,
  multiline = false,
  label,
}: {
  value: string
  onSave: (v: string) => Promise<void>
  multiline?: boolean
  label: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [pulse, setPulse] = useState(false)

  async function save() {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setEditing(false)
    setPulse(true)
    setTimeout(() => setPulse(false), 800)
  }

  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        {multiline ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            style={{ flex: 1, background: INPUT_BG, border: `1px solid ${GOLD}`, borderRadius: 2, color: BODY, fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, padding: '6px 8px', resize: 'vertical' }}
            onKeyDown={(e) => { if (e.key === 'Escape') cancel() }}
          />
        ) : (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ flex: 1, background: INPUT_BG, border: `1px solid ${GOLD}`, borderRadius: 2, color: BODY, fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, padding: '6px 8px' }}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
          />
        )}
        <button onClick={save} disabled={saving} title="Save" style={{ background: 'none', border: 'none', color: GOLD, cursor: 'pointer', fontSize: 16, padding: '2px 4px' }}>✓</button>
        <button onClick={cancel} title="Cancel" style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 16, padding: '2px 4px' }}>×</button>
      </div>
    )
  }

  return (
    <div
      onClick={() => { setDraft(value); setEditing(true) }}
      style={{
        cursor: 'text',
        padding: '4px 6px',
        borderRadius: 2,
        border: `1px solid transparent`,
        boxShadow: pulse ? `0 0 0 2px ${GOLD}` : 'none',
        transition: 'box-shadow 0.3s ease',
        color: value ? BODY : MUTED,
        fontFamily: 'var(--font-montserrat)',
        fontSize: 12,
        fontWeight: 200,
        lineHeight: 1.5,
        minHeight: 24,
      }}
      title={`Click to edit ${label}`}
    >
      {value || <span style={{ color: MUTED, fontStyle: 'italic' }}>—</span>}
    </div>
  )
}

/* ── Password reset modal ───────────────────────────────────────── */
function PasswordResetModal({ password, onClose }: { password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 2, padding: '40px 36px', maxWidth: 400, width: '100%' }}>
        <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 400, color: BODY, margin: '0 0 8px' }}>New password</h3>
        <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, color: RED, margin: '0 0 20px', letterSpacing: '0.05em' }}>
          This will not be shown again.
        </p>
        <div style={{ background: INPUT_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 2, padding: '12px 14px', fontFamily: 'monospace', fontSize: 14, color: GOLD, letterSpacing: '0.05em', marginBottom: 16 }}>
          {password}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={copy}
            style={{ flex: 1, background: GOLD, color: '#0A0A0A', border: 'none', borderRadius: 2, padding: '10px', fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 400, letterSpacing: '0.1em', cursor: 'pointer' }}
          >
            {copied ? 'Copied!' : 'Copy password'}
          </button>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: `1px solid rgba(245,240,232,0.2)`, color: MUTED, borderRadius: 2, padding: '10px 16px', fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Override quality modal ─────────────────────────────────────── */
function OverrideQualityModal({
  submissionId,
  currentQuality,
  adminPassword,
  onClose,
  onDone,
}: {
  submissionId: string
  currentQuality: string | null
  adminPassword: string
  onClose: () => void
  onDone: () => void
}) {
  const [quality, setQuality] = useState(currentQuality ?? 'Medium')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!reason.trim()) { setError('Reason is required'); return }
    setSaving(true)
    const res = await fetch(`/api/admin/submissions/${submissionId}/override-quality`, {
      method: 'POST',
      headers: adminHeaders(adminPassword),
      body: JSON.stringify({ quality, reason }),
    })
    setSaving(false)
    if (res.ok) { onDone(); onClose() }
    else setError('Failed to save')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 2, padding: '36px', maxWidth: 380, width: '100%' }}>
        <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 400, color: BODY, margin: '0 0 20px' }}>Override lead quality</h3>
        <div style={{ marginBottom: 16 }}>
          {['High', 'Medium', 'Low'].map((q) => (
            <label key={q} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8, color: MUTED, fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200 }}>
              <input type="radio" value={q} checked={quality === q} onChange={() => setQuality(q)} />
              {q}
            </label>
          ))}
        </div>
        <textarea
          placeholder="Reason for override (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          style={{ width: '100%', background: INPUT_BG, border: `1px solid rgba(201,169,110,0.2)`, borderRadius: 2, color: BODY, fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, padding: '8px 10px', resize: 'vertical', boxSizing: 'border-box' }}
        />
        {error && <p style={{ color: RED, fontFamily: 'var(--font-montserrat)', fontSize: 11, marginTop: 6 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={submit} disabled={saving} style={{ flex: 1, background: GOLD, color: '#0A0A0A', border: 'none', borderRadius: 2, padding: '10px', fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 400, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Saving…' : 'Override'}
          </button>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid rgba(245,240,232,0.2)`, color: MUTED, borderRadius: 2, padding: '10px 16px', fontFamily: 'var(--font-montserrat)', fontSize: 11, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Brief modal ────────────────────────────────────────────────── */
function BriefModal({ brief, onClose }: { brief: string; onClose: () => void }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 2, padding: '32px', maxWidth: 600, width: '100%', maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ ...labelStyle, margin: 0 }}>AI brief</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <pre style={{ fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, color: MUTED, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, lineHeight: 1.7 }}>
          {brief}
        </pre>
      </div>
    </div>
  )
}

/* ── Designer drawer ────────────────────────────────────────────── */
function DesignerDrawer({
  designer,
  onClose,
  adminPassword,
  onUpdate,
}: {
  designer: Designer
  onClose: () => void
  adminPassword: string
  onUpdate: () => void
}) {
  const [tab, setTab] = useState<'profile' | 'submissions' | 'activity'>('profile')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [activity, setActivity] = useState<AdminAction[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [briefModal, setBriefModal] = useState<string | null>(null)
  const [overrideModal, setOverrideModal] = useState<Submission | null>(null)
  const [expandedActivity, setExpandedActivity] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (tab === 'submissions' && submissions.length === 0) {
      setLoadingSubs(true)
      fetch(`/api/admin/designers/${designer.slug}/submissions`, { headers: adminHeaders(adminPassword) })
        .then((r) => r.json())
        .then((d) => setSubmissions(d.submissions ?? []))
        .catch(() => {})
        .finally(() => setLoadingSubs(false))
    }
    if (tab === 'activity' && activity.length === 0) {
      setLoadingActivity(true)
      fetch(`/api/admin/designers/${designer.slug}/activity`, { headers: adminHeaders(adminPassword) })
        .then((r) => r.json())
        .then((d) => setActivity(d.actions ?? []))
        .catch(() => {})
        .finally(() => setLoadingActivity(false))
    }
  }, [tab, designer.slug, adminPassword, submissions.length, activity.length])

  async function saveField(field: string, value: unknown) {
    await fetch(`/api/admin/designers/${designer.slug}`, {
      method: 'PATCH',
      headers: adminHeaders(adminPassword),
      body: JSON.stringify({ [field]: value }),
    })
    onUpdate()
  }

  async function retryRender(submissionId: string) {
    await fetch(`/api/admin/submissions/${submissionId}/retry-render`, {
      method: 'POST',
      headers: adminHeaders(adminPassword),
    })
    setSubmissions((prev) => prev.map((s) => s.id === submissionId ? { ...s, render_status: 'pending' } : s))
  }

  const EDITABLE_FIELDS: { key: string; label: string; multiline?: boolean }[] = [
    { key: 'name', label: 'Display name' },
    { key: 'studio_name', label: 'Studio name' },
    { key: 'email', label: 'Contact email' },
    { key: 'portfolio_url', label: 'Portfolio URL' },
    { key: 'style_keywords', label: 'Style keywords (comma-separated)' },
    { key: 'typical_project_size', label: 'Typical project size' },
    { key: 'rate_per_sqm', label: 'Rate per m²' },
    { key: 'bio', label: 'Bio', multiline: true },
    { key: 'calendly_url', label: 'Booking link' },
    { key: 'response_tone', label: 'Response tone' },
    { key: 'notification_preference', label: 'Notification preference' },
  ]

  function getFieldValue(key: string): string {
    const d = designer as unknown as Record<string, unknown>
    const v = d[key]
    if (Array.isArray(v)) return v.join(', ')
    return String(v ?? '')
  }

  async function saveFieldValue(key: string, value: string) {
    const toSave = key === 'style_keywords'
      ? value.split(',').map((k) => k.trim()).filter(Boolean)
      : key === 'is_paid'
      ? value === 'true'
      : value
    await saveField(key, toSave)
  }

  return (
    <>
      {briefModal && <BriefModal brief={briefModal} onClose={() => setBriefModal(null)} />}
      {overrideModal && (
        <OverrideQualityModal
          submissionId={overrideModal.id}
          currentQuality={overrideModal.lead_quality}
          adminPassword={adminPassword}
          onClose={() => setOverrideModal(null)}
          onDone={() => {
            setSubmissions([])
          }}
        />
      )}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150 }} onClick={onClose} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(520px, 100vw)',
        background: CARD_BG, borderLeft: `1px solid ${CARD_BORDER}`,
        zIndex: 160, display: 'flex', flexDirection: 'column',
        transform: 'translateX(0)', transition: 'transform 0.25s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 0', borderBottom: `1px solid rgba(201,169,110,0.1)`, paddingBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 400, color: BODY, margin: 0 }}>
                {designer.studio_name || designer.name}
              </h2>
              <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, color: MUTED, margin: '4px 0 0' }}>
                {designer.name} · /{designer.slug}
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 20, padding: '0 4px', lineHeight: 1 }}>×</button>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginTop: 20 }}>
            {(['profile', 'submissions', 'activity'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? GOLD : 'transparent'}`,
                  color: tab === t ? GOLD : MUTED, fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300,
                  letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
                  padding: '6px 14px 8px', transition: 'all 0.2s',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px' }}>
          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {EDITABLE_FIELDS.map(({ key, label, multiline }) => (
                <div key={key}>
                  <p style={{ ...labelStyle, marginBottom: 4, fontSize: 8 }}>{label}</p>
                  <InlineField
                    label={label}
                    value={getFieldValue(key)}
                    onSave={(v) => saveFieldValue(key, v)}
                    multiline={multiline}
                  />
                </div>
              ))}
              <div>
                <p style={{ ...labelStyle, marginBottom: 4, fontSize: 8 }}>Plan tier</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <PlanBadge isPaid={designer.is_paid} />
                  <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 10, color: MUTED, fontWeight: 200 }}>
                    (use Toggle Plan action to change)
                  </span>
                </div>
              </div>
            </div>
          )}

          {tab === 'submissions' && (
            <div>
              {loadingSubs ? (
                <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, color: MUTED }}>Loading…</p>
              ) : submissions.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, color: MUTED }}>No submissions.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Date', 'Client', 'Room', 'Quality', 'Status', 'Actions'].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr key={sub.id}>
                        <td style={tdStyle}>{formatDate(sub.created_at)}</td>
                        <td style={tdStyle}>
                          {sub.client_name}
                          <br />
                          <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.25)' }}>{sub.client_email}</span>
                        </td>
                        <td style={tdStyle}>{sub.room_type}</td>
                        <td style={tdStyle}>{sub.lead_quality ?? '—'}</td>
                        <td style={tdStyle}>{sub.status}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {sub.brief && (
                              <button onClick={() => setBriefModal(sub.brief!)} style={{ background: 'none', border: 'none', color: GOLD, fontFamily: 'var(--font-montserrat)', fontSize: 10, cursor: 'pointer', textDecoration: 'underline', padding: 0, textAlign: 'left' }}>
                                View brief
                              </button>
                            )}
                            <button onClick={() => setOverrideModal(sub)} style={{ background: 'none', border: 'none', color: GOLD, fontFamily: 'var(--font-montserrat)', fontSize: 10, cursor: 'pointer', textDecoration: 'underline', padding: 0, textAlign: 'left' }}>
                              Override quality
                            </button>
                            {sub.render_status === 'failed' && (
                              <button onClick={() => retryRender(sub.id)} style={{ background: 'none', border: 'none', color: GOLD, fontFamily: 'var(--font-montserrat)', fontSize: 10, cursor: 'pointer', textDecoration: 'underline', padding: 0, textAlign: 'left' }}>
                                Retry render
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div>
              {loadingActivity ? (
                <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, color: MUTED }}>Loading…</p>
              ) : activity.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, color: MUTED }}>No activity logged.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {activity.map((a) => (
                    <div key={a.id} style={{ borderBottom: '1px solid rgba(201,169,110,0.06)', padding: '10px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, color: BODY }}>
                            {a.action_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 200, color: MUTED, whiteSpace: 'nowrap', marginLeft: 12 }}>
                          {formatDate(a.created_at)}
                        </span>
                      </div>
                      {Object.keys(a.details ?? {}).length > 0 && (
                        <div>
                          <button
                            onClick={() => setExpandedActivity((prev) => {
                              const next = new Set(prev)
                              if (next.has(a.id)) { next.delete(a.id) } else { next.add(a.id) }
                              return next
                            })}
                            style={{ background: 'none', border: 'none', color: MUTED, fontFamily: 'var(--font-montserrat)', fontSize: 10, cursor: 'pointer', padding: '4px 0' }}
                          >
                            {expandedActivity.has(a.id) ? '▲ hide' : '▼ details'}
                          </button>
                          {expandedActivity.has(a.id) && (
                            <pre style={{ fontFamily: 'monospace', fontSize: 10, color: MUTED, background: '#1A1A1A', padding: '8px', borderRadius: 2, margin: '4px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                              {JSON.stringify(a.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Designers table ────────────────────────────────────────────── */
function AdminDesignersTable({
  designers,
  showArchived,
  onToggleArchived,
  adminPassword,
  onRefresh,
  onSelectDesigner,
}: {
  designers: Designer[]
  showArchived: boolean
  onToggleArchived: () => void
  adminPassword: string
  onRefresh: () => void
  onSelectDesigner: (d: Designer) => void
}) {
  const [resetPasswordData, setResetPasswordData] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>({})

  function feedback(slug: string, msg: string) {
    setActionFeedback((p) => ({ ...p, [slug]: msg }))
    setTimeout(() => setActionFeedback((p) => { const n = { ...p }; delete n[slug]; return n }), 3000)
  }

  async function resetPassword(slug: string) {
    const res = await fetch(`/api/admin/designers/${slug}/reset-password`, { method: 'POST', headers: adminHeaders(adminPassword) })
    const data = await res.json()
    if (data.password) setResetPasswordData(data.password)
    else feedback(slug, 'Reset failed')
  }

  async function togglePlan(slug: string) {
    const res = await fetch(`/api/admin/designers/${slug}/toggle-plan`, { method: 'POST', headers: adminHeaders(adminPassword) })
    if (res.ok) { onRefresh(); feedback(slug, 'Plan updated') }
  }

  async function rescrape(slug: string) {
    await fetch(`/api/admin/designers/${slug}/rescrape`, { method: 'POST', headers: adminHeaders(adminPassword) })
    feedback(slug, 'Rescrape triggered')
  }

  async function testEmail(slug: string) {
    const res = await fetch(`/api/admin/designers/${slug}/test-email`, { method: 'POST', headers: adminHeaders(adminPassword) })
    const data = await res.json()
    feedback(slug, data.success ? `Sent to ${data.sent_to}` : `Failed: ${data.error}`)
  }

  async function previewDashboard(slug: string) {
    const res = await fetch(`/api/admin/designers/${slug}/dashboard-preview`, { method: 'POST', headers: adminHeaders(adminPassword) })
    const data = await res.json()
    if (data.url) window.open(data.url, '_blank')
  }

  async function archive(slug: string) {
    if (!confirm(`Archive ${slug}? Their form will stop working.`)) return
    const res = await fetch(`/api/admin/designers/${slug}/archive`, { method: 'POST', headers: adminHeaders(adminPassword) })
    if (res.ok) onRefresh()
  }

  async function restore(slug: string) {
    const res = await fetch(`/api/admin/designers/${slug}/restore`, { method: 'POST', headers: adminHeaders(adminPassword) })
    if (res.ok) onRefresh()
  }

  return (
    <>
      {resetPasswordData && (
        <PasswordResetModal password={resetPasswordData} onClose={() => setResetPasswordData(null)} />
      )}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 400, color: BODY, margin: 0 }}>
            Designers
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <Pill active={!showArchived} onClick={() => { if (showArchived) onToggleArchived() }}>Active</Pill>
            <Pill active={showArchived} onClick={() => { if (!showArchived) onToggleArchived() }}>Archived</Pill>
          </div>
        </div>

        <div style={{ background: CARD_BG, border: `1px solid rgba(201,169,110,0.15)`, borderRadius: 2, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr>
                {['Name', 'Studio', 'Slug', 'Email', 'Plan', 'Submissions', 'Signup', 'Actions'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {designers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: MUTED, padding: '40px' }}>
                    No designers
                  </td>
                </tr>
              ) : (
                designers.map((d) => (
                  <tr
                    key={d.slug}
                    onClick={() => onSelectDesigner(d)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201,169,110,0.03)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, color: BODY }}>{d.name}</td>
                    <td style={tdStyle}>{d.studio_name ?? '—'}</td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: MUTED }}>/{d.slug}</span>
                    </td>
                    <td style={tdStyle}>{d.email ?? '—'}</td>
                    <td style={tdStyle}><PlanBadge isPaid={d.is_paid} /></td>
                    <td style={tdStyle}>{d.submission_count}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(d.created_at)}</td>
                    <td style={{ ...tdStyle, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {actionFeedback[d.slug] && (
                          <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 10, color: GOLD, fontWeight: 200 }}>
                            {actionFeedback[d.slug]}
                          </span>
                        )}
                        <KebabMenu
                          items={[
                            { label: 'Edit profile', onClick: () => onSelectDesigner(d) },
                            { label: 'Reset dashboard password', onClick: () => resetPassword(d.slug) },
                            { label: 'Toggle plan tier', onClick: () => togglePlan(d.slug) },
                            { label: 'Re-trigger portfolio scrape', onClick: () => rescrape(d.slug) },
                            { label: 'Send test email', onClick: () => testEmail(d.slug) },
                            { label: 'Preview dashboard (read-only)', onClick: () => previewDashboard(d.slug) },
                            { label: 'View submissions', onClick: () => { onSelectDesigner(d) } },
                            d.archived_at
                              ? { label: 'Restore designer', onClick: () => restore(d.slug) }
                              : { label: 'Archive designer', onClick: () => archive(d.slug), danger: true },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

/* ── All submissions table ──────────────────────────────────────── */
function AdminSubmissionsTable({
  adminPassword,
  designers,
}: {
  adminPassword: string
  designers: Designer[]
}) {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [designerFilter, setDesignerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [qualityFilter, setQualityFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [briefModal, setBriefModal] = useState<string | null>(null)
  const [overrideModal, setOverrideModal] = useState<Submission | null>(null)

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (designerFilter) params.set('designer', designerFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (qualityFilter) params.set('quality', qualityFilter)
      if (searchFilter) params.set('search', searchFilter)
      const res = await fetch(`/api/admin/submissions?${params}`, { headers: adminHeaders(adminPassword) })
      if (res.ok) {
        const data = await res.json()
        setSubmissions(data.submissions ?? [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [adminPassword, designerFilter, statusFilter, qualityFilter, searchFilter])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  function exportCSV() {
    if (submissions.length > 1000) {
      alert('Over 1000 rows. Please filter further before exporting.')
      return
    }
    const headers = ['Date', 'Designer', 'Client', 'Email', 'Room', 'Budget', 'Quality', 'Status', 'Render']
    const rows = submissions.map((s) => [
      formatDate(s.created_at),
      s.designer_slug,
      s.client_name,
      s.client_email,
      s.room_type,
      s.budget_range,
      s.lead_quality ?? '',
      s.status,
      s.render_status,
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `submissions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inputStyle: React.CSSProperties = {
    background: INPUT_BG,
    border: '1px solid rgba(201,169,110,0.15)',
    borderRadius: 2,
    color: BODY,
    fontFamily: 'var(--font-montserrat)',
    fontSize: 11,
    fontWeight: 200,
    padding: '6px 10px',
  }

  return (
    <>
      {briefModal && <BriefModal brief={briefModal} onClose={() => setBriefModal(null)} />}
      {overrideModal && (
        <OverrideQualityModal
          submissionId={overrideModal.id}
          currentQuality={overrideModal.lead_quality}
          adminPassword={adminPassword}
          onClose={() => setOverrideModal(null)}
          onDone={fetchSubmissions}
        />
      )}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 400, color: BODY, margin: 0 }}>
            All Submissions
          </h2>
          <button
            onClick={exportCSV}
            style={{ background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD, borderRadius: 2, padding: '8px 16px', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase' }}
          >
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <input
            placeholder="Search client name or email"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{ ...inputStyle, minWidth: 220 }}
          />
          <select value={designerFilter} onChange={(e) => setDesignerFilter(e.target.value)} style={inputStyle}>
            <option value="">All designers</option>
            {designers.map((d) => <option key={d.slug} value={d.slug}>{d.studio_name || d.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">All statuses</option>
            {['New', 'Contacted', 'Converted', 'Not a fit'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={qualityFilter} onChange={(e) => setQualityFilter(e.target.value)} style={inputStyle}>
            <option value="">All qualities</option>
            {['High', 'Medium', 'Low'].map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>

        <div style={{ background: CARD_BG, border: '1px solid rgba(201,169,110,0.15)', borderRadius: 2, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                {['Date', 'Designer', 'Client', 'Room', 'Budget', 'Quality', 'Status', 'Render', 'Actions'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: '40px' }}>Loading…</td></tr>
              ) : submissions.length === 0 ? (
                <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: '40px' }}>No submissions found</td></tr>
              ) : (
                submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(sub.created_at)}</td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'monospace', fontSize: 10, color: MUTED }}>/{sub.designer_slug}</span>
                    </td>
                    <td style={tdStyle}>
                      {sub.client_name}
                      <br />
                      <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.25)' }}>{sub.client_email}</span>
                    </td>
                    <td style={tdStyle}>{sub.room_type}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{sub.budget_range}</td>
                    <td style={tdStyle}>{sub.lead_quality ?? '—'}</td>
                    <td style={tdStyle}>{sub.status}</td>
                    <td style={tdStyle}>{sub.render_status}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {sub.brief && (
                          <button onClick={() => setBriefModal(sub.brief!)} style={{ background: 'none', border: 'none', color: GOLD, fontFamily: 'var(--font-montserrat)', fontSize: 10, cursor: 'pointer', textDecoration: 'underline', padding: 0, textAlign: 'left' }}>
                            View brief
                          </button>
                        )}
                        <button onClick={() => setOverrideModal(sub)} style={{ background: 'none', border: 'none', color: GOLD, fontFamily: 'var(--font-montserrat)', fontSize: 10, cursor: 'pointer', textDecoration: 'underline', padding: 0, textAlign: 'left' }}>
                          Override quality
                        </button>
                        {sub.results_page_token && (
                          <a href={`/results/${sub.results_page_token}`} target="_blank" rel="noopener noreferrer" style={{ color: GOLD, fontFamily: 'var(--font-montserrat)', fontSize: 10, textDecoration: 'underline' }}>
                            View results
                          </a>
                        )}
                        {sub.render_status === 'failed' && (
                          <button
                            onClick={async () => {
                              await fetch(`/api/admin/submissions/${sub.id}/retry-render`, { method: 'POST', headers: adminHeaders(adminPassword) })
                              fetchSubmissions()
                            }}
                            style={{ background: 'none', border: 'none', color: GOLD, fontFamily: 'var(--font-montserrat)', fontSize: 10, cursor: 'pointer', textDecoration: 'underline', padding: 0, textAlign: 'left' }}
                          >
                            Retry render
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

/* ── Main admin page ────────────────────────────────────────────── */
export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [adminPassword, setAdminPassword] = useState('')
  const [designers, setDesigners] = useState<Designer[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [activeTab, setActiveTab] = useState<'designers' | 'submissions' | 'billing'>('designers')
  const [selectedDesigner, setSelectedDesigner] = useState<Designer | null>(null)

  useEffect(() => {
    const ok = sessionStorage.getItem(ADMIN_KEY) === 'true'
    const storedPw = sessionStorage.getItem('designlead_admin_pw') ?? ''
    if (ok) {
      setAuthed(true)
      setAdminPassword(storedPw)
    }
    setChecking(false)
  }, [])

  const fetchData = useCallback(async (pw: string, archived: boolean) => {
    setLoadingData(true)
    try {
      const res = await fetch(`/api/admin/data?archived=${archived}`, { headers: adminHeaders(pw) })
      if (res.ok) {
        const data = await res.json()
        setDesigners(data.designers ?? [])
        setMetrics(data.metrics ?? null)
      }
    } catch { /* ignore */ }
    setLoadingData(false)
  }, [])

  useEffect(() => {
    if (authed && adminPassword) fetchData(adminPassword, showArchived)
  }, [authed, adminPassword, showArchived, fetchData])

  function handleAuthSuccess(pw: string) {
    setAdminPassword(pw)
    sessionStorage.setItem('designlead_admin_pw', pw)
    setAuthed(true)
  }

  function logout() {
    sessionStorage.removeItem(ADMIN_KEY)
    sessionStorage.removeItem('designlead_admin_pw')
    window.location.reload()
  }

  if (checking) return null
  if (!authed) return <AdminPasswordScreen onSuccess={handleAuthSuccess} />

  const qb = metrics?.quality_breakdown

  return (
    <div style={{ background: 'radial-gradient(ellipse at center, #141414 0%, #0A0A0A 70%)', minHeight: '100vh', padding: '40px 24px 80px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 400, color: BODY, margin: '0 0 4px', letterSpacing: '0.02em' }}>
              Admin
            </h1>
            <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, color: MUTED, letterSpacing: '0.14em', margin: 0, textTransform: 'uppercase' }}>
              DesignLead operator console
            </p>
          </div>
          <button
            onClick={logout}
            style={{ background: 'none', border: 'none', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.14em', color: MUTED, cursor: 'pointer', textTransform: 'uppercase', padding: 0 }}
          >
            Log out
          </button>
        </div>

        {/* Health panel */}
        <AdminHealthPanel adminPassword={adminPassword} />

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 40 }}>
          <MetricCard label="Active designers" value={metrics?.total_designers ?? '—'} />
          <MetricCard label="Submissions this week" value={metrics?.submissions_this_week ?? '—'} />
          <MetricCard label="Renders this week" value={metrics?.renders_this_week ?? '—'} />
          <MetricCard
            label="Lead quality this week"
            value={qb ? `H ${qb.high}% / M ${qb.medium}% / L ${qb.low}%` : '—'}
          />
        </div>

        {/* Main tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid rgba(201,169,110,0.1)' }}>
          {([['designers', 'Designers'], ['submissions', 'All Submissions'], ['billing', 'Billing']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === key ? GOLD : 'transparent'}`,
                color: activeTab === key ? GOLD : MUTED, fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300,
                letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
                padding: '8px 18px 10px', transition: 'all 0.2s', marginBottom: -1,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {loadingData && activeTab !== 'submissions' ? (
          <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 13, color: MUTED }}>Loading…</p>
        ) : (
          <>
            {activeTab === 'designers' && (
              <AdminDesignersTable
                designers={designers}
                showArchived={showArchived}
                onToggleArchived={() => setShowArchived((p) => !p)}
                adminPassword={adminPassword}
                onRefresh={() => fetchData(adminPassword, showArchived)}
                onSelectDesigner={setSelectedDesigner}
              />
            )}
            {activeTab === 'submissions' && (
              <AdminSubmissionsTable adminPassword={adminPassword} designers={designers} />
            )}
            {activeTab === 'billing' && (
              <div style={{ background: CARD_BG, border: '1px solid rgba(201,169,110,0.15)', borderRadius: 2, padding: '40px', textAlign: 'center' }}>
                <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 400, color: BODY, margin: '0 0 12px' }}>Billing</h2>
                <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 13, fontWeight: 200, color: MUTED, margin: 0 }}>
                  Coming soon — Stripe integration planned for a future phase.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Designer detail drawer */}
      {selectedDesigner && (
        <DesignerDrawer
          designer={selectedDesigner}
          onClose={() => setSelectedDesigner(null)}
          adminPassword={adminPassword}
          onUpdate={() => fetchData(adminPassword, showArchived)}
        />
      )}
    </div>
  )
}
