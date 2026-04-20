'use client'

import { useState, useRef, useCallback } from 'react'

type FormData = {
  name: string
  email: string
  roomType: string
  roomSize: string
  designStyle: string
  budgetRange: string
  timeline: string
  additionalInfo: string
}

type PhotoItem = { file: File; preview: string }
type Status = 'idle' | 'loading' | 'success' | 'error'

const ROOM_TYPES = [
  'Living room',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Home office',
  'Multiple rooms',
]

const DESIGN_STYLES = [
  'Minimalist & clean',
  'Warm & natural',
  'Bold & eclectic',
  'Modern & urban',
  "I'm not sure yet",
]

const BUDGET_RANGES = [
  'Under 500,000 HUF',
  '500,000–1,500,000 HUF',
  '1,500,000–3,000,000 HUF',
  'Above 3,000,000 HUF',
]

const TIMELINES = [
  'As soon as possible',
  '1–3 months',
  '3–6 months',
  'Just exploring for now',
]

const ALLOWED_TYPES = ['image/jpeg', 'image/png']
const MAX_PHOTO_SIZE = 5 * 1024 * 1024

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

const STEPS = [
  { label: 'Rólad',              heading: 'Rólad',              subtitle: 'Mutasd be magad' },
  { label: 'A térről',           heading: 'A térről',           subtitle: 'Meséld el a tervezendő helyiségről' },
  { label: 'Képek és részletek', heading: 'Képek és részletek', subtitle: 'Fotók és kiegészítő információk' },
]

/* ── Field label ────────────────────────────────────────────────── */
function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        fontSize: 10,
        fontWeight: 300,
        letterSpacing: '0.14em',
        color: 'rgba(237, 229, 208, 0.6)',
        textTransform: 'uppercase',
        marginBottom: 8,
        fontFamily: 'var(--font-montserrat)',
      }}
    >
      {children}
    </label>
  )
}

/* ── Error text ─────────────────────────────────────────────────── */
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p style={{ color: 'rgba(220, 130, 90, 0.9)', fontSize: 12, marginTop: 6, fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
      {message}
    </p>
  )
}

type DesignerProp = { slug: string; name: string; studio_name: string | null }

/* ── Main component ─────────────────────────────────────────────── */
export default function IntakeForm({ designer, embed }: { designer: DesignerProp; embed?: boolean }) {
  const displayName = designer.studio_name || designer.name

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    roomType: '',
    roomSize: '',
    designStyle: '',
    budgetRange: '',
    timeline: '',
    additionalInfo: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'photos', string>>>({})
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [photoError, setPhotoError] = useState<string>()
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── Photo helpers ──────────────────────────────────────────────── */
  const addFiles = useCallback((incoming: File[]) => {
    const valid: PhotoItem[] = []
    let errorMsg = ''
    for (const file of incoming) {
      if (!ALLOWED_TYPES.includes(file.type)) { errorMsg = 'Only JPEG, PNG, or WebP images are allowed.'; continue }
      if (file.size > MAX_PHOTO_SIZE) { errorMsg = `"${file.name}" is over 5 MB.`; continue }
      valid.push({ file, preview: URL.createObjectURL(file) })
    }
    setPhotos((prev) => {
      const combined = [...prev, ...valid].slice(0, 3)
      valid.slice(combined.length - prev.length).forEach((item) => URL.revokeObjectURL(item.preview))
      return combined
    })
    if (errorMsg) setPhotoError(errorMsg)
    else setPhotoError(undefined)
  }, [])

  function removePhoto(index: number) {
    setPhotos((prev) => { URL.revokeObjectURL(prev[index].preview); return prev.filter((_, i) => i !== index) })
  }
  function handleFileInput(ev: React.ChangeEvent<HTMLInputElement>) {
    if (ev.target.files) addFiles(Array.from(ev.target.files))
    ev.target.value = ''
  }
  function handleDrop(ev: React.DragEvent) { ev.preventDefault(); setIsDragging(false); addFiles(Array.from(ev.dataTransfer.files)) }
  function handleDragOver(ev: React.DragEvent) { ev.preventDefault(); setIsDragging(true) }
  function handleDragLeave() { setIsDragging(false) }

  /* ── Validation ─────────────────────────────────────────────────── */
  function validateStep1(): boolean {
    const e: Partial<Record<keyof FormData | 'photos', string>> = {}
    if (!form.name.trim()) e.name = 'Please enter your name.'
    if (!form.email.trim()) e.email = 'Please enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email address.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep2(): boolean {
    const e: Partial<Record<keyof FormData | 'photos', string>> = {}
    if (!form.roomType) e.roomType = 'Please select a room type.'
    if (!form.roomSize) e.roomSize = 'Please enter the room size.'
    else { const s = Number(form.roomSize); if (isNaN(s) || s < 10 || s > 500) e.roomSize = 'Room size must be between 10 and 500 m².' }
    if (!form.designStyle) e.designStyle = 'Please select a design style.'
    if (!form.budgetRange) e.budgetRange = 'Please select a budget range.'
    if (!form.timeline) e.timeline = 'Please select a timeline.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormData | 'photos', string>> = {}
    if (!form.name.trim()) e.name = 'Please enter your name.'
    if (!form.email.trim()) e.email = 'Please enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email address.'
    if (!form.roomType) e.roomType = 'Please select a room type.'
    if (!form.roomSize) e.roomSize = 'Please enter the room size.'
    else { const s = Number(form.roomSize); if (isNaN(s) || s < 10 || s > 500) e.roomSize = 'Room size must be between 10 and 500 m².' }
    if (!form.designStyle) e.designStyle = 'Please select a design style.'
    if (!form.budgetRange) e.budgetRange = 'Please select a budget range.'
    if (!form.timeline) e.timeline = 'Please select a timeline.'
    if (photos.length === 0) e.photos = 'Please upload at least one photo of your space.'
    setErrors(e)
    if (e.photos) setPhotoError(e.photos)
    setSubmitAttempted(true)
    return Object.keys(e).length === 0
  }

  /* ── Submit ─────────────────────────────────────────────────────── */
  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setStatus('loading')
    try {
      const photoFormData = new FormData()
      photos.forEach((p) => photoFormData.append('photos', p.file))
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: photoFormData })
      if (!uploadRes.ok) {
        let msg = 'Photo upload failed.'
        try { const d = await uploadRes.json(); msg = d.error || msg } catch { /* non-JSON */ }
        throw new Error(msg)
      }
      const { paths: photoPaths } = await uploadRes.json()
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photoPaths, designer_slug: designer.slug }),
      })
      if (!res.ok) {
        let msg = 'Submission failed.'
        try { const d = await res.json(); msg = d.error || msg } catch { /* non-JSON */ }
        throw new Error(msg)
      }
      setStatus('success')
    } catch (err) {
      console.error('Submit error:', err)
      setStatus('error')
    }
  }

  function handleChange(ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = ev.target
    setForm((p) => ({ ...p, [name]: value }))
    if (errors[name as keyof FormData]) setErrors((p) => ({ ...p, [name]: undefined }))
  }

  function nextStep() {
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setErrors({})
    setStep((s) => Math.min(s + 1, 3))
  }

  function prevStep() {
    setErrors({})
    setStep((s) => Math.max(s - 1, 1))
  }

  /* ── Shared styles ──────────────────────────────────────────────── */
  const cardStyle: React.CSSProperties = {
    background: 'var(--dl-bg-card)',
    border: '1px solid var(--dl-border-accent)',
    borderRadius: 6,
    width: '100%',
    maxWidth: 620,
  }

  const inputOverride: React.CSSProperties = {
    background: 'var(--dl-bg-elevated)',
    borderColor: 'var(--dl-border-default)',
    color: 'var(--dl-text-primary)',
  }

  /* ── Success state ──────────────────────────────────────────────── */
  if (status === 'success') {
    return (
      <div
        style={{ ...DL, background: embed ? 'transparent' : 'var(--dl-bg-page)', minHeight: '100vh' }}
        className="flex items-center justify-center px-4 py-16"
      >
        <div style={{ ...cardStyle, padding: '64px 48px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke="var(--dl-accent)" strokeWidth="1.5" opacity="0.35" />
              <path d="M8 14L12 18L20 10" stroke="var(--dl-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 400, color: 'var(--dl-text-primary)', marginBottom: 12, letterSpacing: '0.02em' }}>
            Thank you
          </h2>
          <p style={{ color: 'var(--dl-text-muted)', fontSize: 15, lineHeight: 1.7, maxWidth: 340, margin: '0 auto', fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
            {displayName.split(' ')[0]} will review your project and be in touch within 2 business days.
          </p>
        </div>
      </div>
    )
  }

  /* ── Form ───────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        ...DL,
        background: embed ? 'transparent' : 'var(--dl-bg-page)',
        minHeight: '100vh',
        animation: 'dl-fade-in 0.3s ease both',
      }}
      className="flex items-center justify-center px-4 py-16"
    >
      <div style={cardStyle}>

        {/* Header */}
        <div className="card-header">
          <h1
            style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: 36,
              fontWeight: 400,
              letterSpacing: '0.02em',
              color: 'var(--dl-text-primary)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {displayName}
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-montserrat)',
              fontSize: 11,
              fontWeight: 200,
              color: 'var(--dl-text-muted)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginTop: 10,
            }}
          >
            Thoughtful spaces for modern living
          </p>
          <hr style={{ border: 'none', borderTop: '1px solid var(--dl-border-accent)', width: 40, margin: '20px auto 0' }} />
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} noValidate className="card-body">

          {/* Step pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            {STEPS.map((s, i) => {
              const n = i + 1
              const active = step === n
              const past = step > n
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => { if (past) { setErrors({}); setStep(n) } }}
                  style={{
                    flex: 1,
                    background: active ? 'var(--dl-accent-subtle)' : 'transparent',
                    border: `1px solid ${active ? 'var(--dl-border-accent)' : 'var(--dl-border-default)'}`,
                    borderRadius: 2,
                    padding: '6px 4px',
                    fontFamily: 'var(--font-montserrat)',
                    fontSize: 9,
                    fontWeight: 300,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: active ? 'var(--dl-accent)' : 'var(--dl-text-muted)',
                    cursor: past ? 'pointer' : 'default',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.label}
                </button>
              )
            })}
          </div>

          {/* Step heading */}
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 400, color: 'var(--dl-text-primary)', margin: '0 0 6px', letterSpacing: '0.02em' }}>
            {STEPS[step - 1].heading}
          </h2>
          <p style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 200, fontSize: 13, color: 'var(--dl-text-muted)', margin: 0 }}>
            {STEPS[step - 1].subtitle}
          </p>
          <div style={{ height: 1, background: 'var(--dl-rule-gradient)', margin: '16px 0 24px' }} />

          {/* ── STEP 1: Rólad ─────────────────────────────────────── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <FieldLabel htmlFor="name">Full name</FieldLabel>
                <input
                  id="name" name="name" type="text" autoComplete="name"
                  value={form.name} onChange={handleChange} placeholder="Jane Smith"
                  className="form-input dl-input" style={inputOverride}
                />
                <FieldError message={errors.name} />
              </div>
              <div>
                <FieldLabel htmlFor="email">Email address</FieldLabel>
                <input
                  id="email" name="email" type="email" autoComplete="email"
                  value={form.email} onChange={handleChange} placeholder="jane@example.com"
                  className="form-input dl-input" style={inputOverride}
                />
                <FieldError message={errors.email} />
              </div>
            </div>
          )}

          {/* ── STEP 2: A térről ──────────────────────────────────── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <FieldLabel htmlFor="roomType">Room type</FieldLabel>
                <select
                  id="roomType" name="roomType" value={form.roomType}
                  onChange={handleChange} className="form-input dl-input" style={inputOverride}
                >
                  <option value="">Select a room type</option>
                  {ROOM_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <FieldError message={errors.roomType} />
              </div>
              <div>
                <FieldLabel htmlFor="roomSize">Room size (m²)</FieldLabel>
                <input
                  id="roomSize" name="roomSize" type="number" min={10} max={500}
                  value={form.roomSize} onChange={handleChange} placeholder="e.g. 35"
                  className="form-input dl-input" style={inputOverride}
                />
                <FieldError message={errors.roomSize} />
              </div>
              <div>
                <FieldLabel>Design style</FieldLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {DESIGN_STYLES.map((style) => {
                    const checked = form.designStyle === style
                    return (
                      <label
                        key={style}
                        className={`radio-option${checked ? ' radio-option--checked' : ''}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          cursor: 'pointer',
                          padding: '11px 14px',
                          borderRadius: 2,
                          border: `1px solid ${checked ? 'var(--dl-accent)' : 'var(--dl-border-accent)'}`,
                          background: checked ? 'var(--dl-accent-subtle)' : 'transparent',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <input
                          type="radio" name="designStyle" value={style}
                          checked={checked} onChange={handleChange}
                          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{ fontSize: 13, color: checked ? 'var(--dl-text-primary)' : 'rgba(237,229,208,0.65)', fontFamily: 'var(--font-montserrat)', fontWeight: 200, transition: 'color 0.2s ease' }}>
                          {style}
                        </span>
                        <span style={{ width: 6, height: 6, minWidth: 6, borderRadius: '50%', border: `1px solid ${checked ? 'var(--dl-accent)' : 'var(--dl-accent-dim)'}`, background: checked ? 'var(--dl-accent)' : 'transparent', flexShrink: 0, transition: 'all 0.2s ease' }} />
                      </label>
                    )
                  })}
                </div>
                <FieldError message={errors.designStyle} />
              </div>
              <div>
                <FieldLabel htmlFor="budgetRange">Budget range</FieldLabel>
                <select
                  id="budgetRange" name="budgetRange" value={form.budgetRange}
                  onChange={handleChange} className="form-input dl-input" style={inputOverride}
                >
                  <option value="">Select a budget range</option>
                  {BUDGET_RANGES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <FieldError message={errors.budgetRange} />
              </div>
              <div>
                <FieldLabel htmlFor="timeline">Timeline</FieldLabel>
                <select
                  id="timeline" name="timeline" value={form.timeline}
                  onChange={handleChange} className="form-input dl-input" style={inputOverride}
                >
                  <option value="">Select a timeline</option>
                  {TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <FieldError message={errors.timeline} />
              </div>
            </div>
          )}

          {/* ── STEP 3: Képek és részletek ────────────────────────── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Photo upload */}
              <div>
                <FieldLabel>
                  Upload 1–3 photos of the room{' '}
                  <span style={{ color: 'var(--dl-accent-dim)', textTransform: 'none', letterSpacing: 0, fontWeight: 200 }}>(required)</span>
                </FieldLabel>
                <input
                  ref={fileInputRef} type="file" accept="image/jpeg,image/png" multiple
                  onChange={handleFileInput} style={{ display: 'none' }} aria-label="Upload room photos"
                />
                {photos.length < 3 && (
                  <div
                    role="button" tabIndex={0} aria-label="Click or drag to upload photos"
                    className="photo-drop-zone"
                    onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                    style={{
                      border: `1px dashed ${isDragging ? 'var(--dl-accent)' : 'var(--dl-border-accent)'}`,
                      borderRadius: 2,
                      padding: '28px 20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: isDragging ? 'rgba(184,147,90,0.04)' : 'transparent',
                      transition: 'border-color 0.2s ease, background 0.2s ease',
                      userSelect: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 0L8.5 7.5M12 4l3.5 3.5"
                          stroke={isDragging ? 'var(--dl-accent)' : 'var(--dl-accent-dim)'}
                          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <p style={{ color: isDragging ? 'var(--dl-accent)' : 'var(--dl-text-muted)', fontSize: 13, margin: '0 0 4px', fontFamily: 'var(--font-montserrat)', fontWeight: 200, transition: 'color 0.2s ease' }}>
                      {isDragging ? 'Drop photos here' : 'Click to upload or drag and drop'}
                    </p>
                    {photos.length > 0 && (
                      <p style={{ color: 'var(--dl-accent)', fontSize: 12, margin: '4px 0 0', fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
                        {photos.length} {photos.length === 1 ? 'photo' : 'photos'} selected
                      </p>
                    )}
                    <p style={{ color: 'rgba(237,229,208,0.2)', fontSize: 12, margin: '4px 0 0', fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
                      JPEG or PNG · max 5 MB each · up to 3 photos
                    </p>
                  </div>
                )}
                {photos.length > 0 && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                    {photos.map((item, i) => (
                      <div key={i} style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.preview} alt={`Room photo ${i + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2, border: '1px solid var(--dl-border-accent)', display: 'block' }}
                        />
                        <button
                          type="button" onClick={() => removePhoto(i)} aria-label={`Remove photo ${i + 1}`}
                          style={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: '50%', background: 'var(--dl-accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F0D0A', fontSize: 12, fontWeight: 700, lineHeight: 1, padding: 0 }}
                        >×</button>
                      </div>
                    ))}
                    {photos.length < 3 && (
                      <button
                        type="button" onClick={() => fileInputRef.current?.click()}
                        style={{ width: 88, height: 88, borderRadius: 2, border: '1px dashed var(--dl-border-accent)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dl-accent-dim)', fontSize: 22, transition: 'border-color 0.2s ease', flexShrink: 0 }}
                        aria-label="Add another photo"
                      >+</button>
                    )}
                  </div>
                )}
                <FieldError message={photoError} />
              </div>

              {/* Additional info */}
              <div>
                <FieldLabel htmlFor="additionalInfo">
                  Anything else we should know?{' '}
                  <span style={{ color: 'var(--dl-accent-dim)', textTransform: 'none', letterSpacing: 0, fontWeight: 200 }}>(optional)</span>
                </FieldLabel>
                <textarea
                  id="additionalInfo" name="additionalInfo" rows={4}
                  value={form.additionalInfo} onChange={handleChange}
                  placeholder="Special requirements, inspirations, constraints…"
                  className="form-input dl-input" style={inputOverride}
                />
              </div>

              {/* Error messages */}
              {submitAttempted && Object.keys(errors).length > 0 && status !== 'loading' && (
                <p style={{ color: 'rgba(220, 130, 90, 0.9)', fontSize: 12, fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
                  Please review the fields above — some required information is missing.
                </p>
              )}
              {status === 'error' && (
                <p style={{ color: 'rgba(220, 130, 90, 0.9)', fontSize: 12, fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
                  Something went wrong. Please try again or contact us directly.
                </p>
              )}
            </div>
          )}

          {/* ── Navigation ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 12, paddingTop: 32 }}>
            {step > 1 && (
              <button
                type="button" onClick={prevStep}
                style={{ flex: '0 0 auto', background: 'transparent', border: '1px solid var(--dl-border-accent)', color: 'var(--dl-text-muted)', fontFamily: 'var(--font-montserrat)', fontWeight: 400, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', borderRadius: 2, padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.2s ease, background 0.2s ease' }}
              >←</button>
            )}
            {step < 3 ? (
              <button
                type="button" onClick={nextStep}
                style={{ flex: 1, background: 'var(--dl-accent)', color: '#0F0D0A', fontWeight: 400, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, padding: '16px 24px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-montserrat)' }}
                className="dl-btn-primary"
              >
                Következő →
              </button>
            ) : (
              <button
                type="submit" disabled={status === 'loading'}
                style={{ flex: 1, background: 'var(--dl-accent)', color: '#0F0D0A', fontWeight: 400, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, padding: '16px 24px', border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer', opacity: status === 'loading' ? 0.8 : 1, fontFamily: 'var(--font-montserrat)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                className="dl-btn-primary"
              >
                {status === 'loading'
                  ? <span className="dl-ellipsis">Beküldés</span>
                  : 'Beküldés'
                }
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  )
}
