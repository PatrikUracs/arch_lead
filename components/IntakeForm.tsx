'use client'

import { useState, useRef, useCallback } from 'react'

type FormData = {
  name: string
  email: string
  roomType: string
  roomSize: string
  projectType: string
  roomCount: string
  designStyle: string
  designBudgetHuf: string
  fitoutPlanned: '' | 'yes' | 'no'
  fitoutBudgetHuf: string
  timeline: string
  additionalInfo: string
}

type PhotoItem = { file: File; preview: string }
type Status = 'idle' | 'loading' | 'success' | 'error'

const PROJECT_TYPES = [
  { label: 'Teljes lakásfelújítás',     value: 'full_redesign'   },
  { label: 'Részleges átalakítás',      value: 'partial_refresh' },
  { label: 'Egyetlen helyiség',         value: 'single_room'     },
  { label: 'Tanácsadás / konzultáció', value: 'consultation'    },
]

const ROOM_COUNTS = ['1', '2', '3', '4', '5+']

const DESIGN_FEE_BRACKETS = [
  '400 000 – 800 000 Ft',
  '800 000 – 1 500 000 Ft',
  '1 500 000 – 3 000 000 Ft',
  '3 000 000 – 6 000 000 Ft',
  '6 000 000 Ft felett',
]

const ROOM_TYPES = [
  'Nappali',
  'Hálószoba',
  'Konyha',
  'Fürdőszoba',
  'Dolgozószoba',
  'Több helyiség',
]

const DESIGN_STYLES = [
  'Minimalista & letisztult',
  'Meleg & természetes',
  'Merész & eklektikus',
  'Modern & urbánus',
  'Még nem tudom',
]

const TIMELINES = [
  'Minél hamarabb',
  '1–3 hónap',
  '3–6 hónap',
  'Egyelőre csak tájékozódom',
]

const ALLOWED_TYPES = ['image/jpeg', 'image/png']
const MAX_PHOTO_SIZE = 5 * 1024 * 1024


const STEPS = [
  { label: 'Rólad',         heading: 'Rólad',         subtitle: 'Mutasd be magad' },
  { label: 'A projektről',  heading: 'A projektről',  subtitle: 'Meséld el a tervezendő projektről' },
  { label: 'Fotók & részletek', heading: 'Fotók & részletek', subtitle: 'Fotók és kiegészítő információk' },
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
    projectType: '',
    roomCount: '',
    designStyle: '',
    designBudgetHuf: '',
    fitoutPlanned: '',
    fitoutBudgetHuf: '',
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
      if (!ALLOWED_TYPES.includes(file.type)) { errorMsg = 'Csak JPEG vagy PNG formátumú képek tölthetők fel.'; continue }
      if (file.size > MAX_PHOTO_SIZE) { errorMsg = `"${file.name}" mérete meghaladja az 5 MB-ot.`; continue }
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
    if (!form.name.trim()) e.name = 'Kérjük, add meg a neved.'
    if (!form.email.trim()) e.email = 'Kérjük, add meg az e-mail címed.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Kérjük, adj meg egy érvényes e-mail címet.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep2(): boolean {
    const e: Partial<Record<keyof FormData | 'photos', string>> = {}
    if (!form.roomType) e.roomType = 'Kérjük, válassz helyiség típust.'
    if (!form.roomSize) e.roomSize = 'Kérjük, add meg a helyiség méretét.'
    else { const s = Number(form.roomSize); if (isNaN(s) || s < 10 || s > 500) e.roomSize = 'A helyiség mérete 10 és 500 m² között legyen.' }
    if (!form.projectType) e.projectType = 'Kérjük, válassz projekt típust.'
    if (!form.roomCount) e.roomCount = 'Kérjük, add meg az érintett helyiségek számát.'
    if (!form.designStyle) e.designStyle = 'Kérjük, válassz stílusirányzatot.'
    if (!form.designBudgetHuf) e.designBudgetHuf = 'Kérjük, válassz tervezői díjkeretet.'
    if (!form.fitoutPlanned) e.fitoutPlanned = 'Kérjük, jelezd, hogy tervezed-e a kivitelezést.'
    if (form.fitoutPlanned === 'yes' && !form.fitoutBudgetHuf) e.fitoutBudgetHuf = 'Kérjük, válasszon kivitelezési keretet.'
    if (!form.timeline) e.timeline = 'Kérjük, válassz időkeretet.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormData | 'photos', string>> = {}
    if (!form.name.trim()) e.name = 'Kérjük, add meg a neved.'
    if (!form.email.trim()) e.email = 'Kérjük, add meg az e-mail címed.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Kérjük, adj meg egy érvényes e-mail címet.'
    if (!form.roomType) e.roomType = 'Kérjük, válassz helyiség típust.'
    if (!form.roomSize) e.roomSize = 'Kérjük, add meg a helyiség méretét.'
    else { const s = Number(form.roomSize); if (isNaN(s) || s < 10 || s > 500) e.roomSize = 'A helyiség mérete 10 és 500 m² között legyen.' }
    if (!form.projectType) e.projectType = 'Kérjük, válassz projekt típust.'
    if (!form.roomCount) e.roomCount = 'Kérjük, add meg az érintett helyiségek számát.'
    if (!form.designStyle) e.designStyle = 'Kérjük, válassz stílusirányzatot.'
    if (!form.designBudgetHuf) e.designBudgetHuf = 'Kérjük, válassz tervezői díjkeretet.'
    if (!form.fitoutPlanned) e.fitoutPlanned = 'Kérjük, jelezd, hogy tervezed-e a kivitelezést.'
    if (form.fitoutPlanned === 'yes' && !form.fitoutBudgetHuf) e.fitoutBudgetHuf = 'Kérjük, válasszon kivitelezési keretet.'
    if (!form.timeline) e.timeline = 'Kérjük, válassz időkeretet.'
    if (photos.length === 0) e.photos = 'Kérjük, tölts fel legalább 1 fotót.'
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
        let msg = 'Fotó feltöltése sikertelen.'
        try { const d = await uploadRes.json(); msg = d.error || msg } catch { /* non-JSON */ }
        throw new Error(msg)
      }
      const { paths: photoPaths, uploadToken } = await uploadRes.json()
      const payload = {
        ...form,
        roomCount: form.roomCount === '5+' ? '5' : form.roomCount,
        fitoutBudgetHuf: form.fitoutPlanned === 'yes' ? form.fitoutBudgetHuf : null,
        photoPaths,
        uploadToken,
        designer_slug: designer.slug,
      }
      console.log('[submit] payload:', JSON.stringify(payload, null, 2))
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        let msg = 'Beküldés sikertelen.'
        try { const d = await res.json(); console.error('[submit] server error:', d); msg = d.error || msg } catch { /* non-JSON */ }
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
        style={{ background: embed ? 'transparent' : 'var(--dl-bg-page)', minHeight: '100vh' }}
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
            Köszönjük!
          </h2>
          <p style={{ color: 'var(--dl-text-muted)', fontSize: 15, lineHeight: 1.7, maxWidth: 340, margin: '0 auto', fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
            Érdeklődésed megkaptuk. Hamarosan felvesszük veled a kapcsolatot.
          </p>
        </div>
      </div>
    )
  }

  /* ── Form ───────────────────────────────────────────────────────── */
  return (
    <div
      style={{
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
            Átgondolt terek a modern élethez
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
                <FieldLabel htmlFor="name">Neved</FieldLabel>
                <input
                  id="name" name="name" type="text" autoComplete="name"
                  value={form.name} onChange={handleChange} placeholder="Teljes neved"
                  className="form-input dl-input" style={inputOverride}
                />
                <FieldError message={errors.name} />
              </div>
              <div>
                <FieldLabel htmlFor="email">E-mail címed</FieldLabel>
                <input
                  id="email" name="email" type="email" autoComplete="email"
                  value={form.email} onChange={handleChange} placeholder="email@example.com"
                  className="form-input dl-input" style={inputOverride}
                />
                <FieldError message={errors.email} />
              </div>
            </div>
          )}

          {/* ── STEP 2: A projektről ──────────────────────────────── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <FieldLabel htmlFor="roomType">Helyiség típusa</FieldLabel>
                <select
                  id="roomType" name="roomType" value={form.roomType}
                  onChange={handleChange} className="form-input dl-input" style={inputOverride}
                >
                  <option value="">Válassz helyiség típust</option>
                  {ROOM_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <FieldError message={errors.roomType} />
              </div>
              <div>
                <FieldLabel htmlFor="roomSize">Helyiség mérete (m²)</FieldLabel>
                <input
                  id="roomSize" name="roomSize" type="number" min={10} max={500}
                  value={form.roomSize} onChange={handleChange} placeholder="pl. 25"
                  className="form-input dl-input" style={inputOverride}
                />
                <FieldError message={errors.roomSize} />
              </div>
              <div>
                <FieldLabel htmlFor="projectType">Projekt típusa</FieldLabel>
                <select
                  id="projectType" name="projectType" value={form.projectType}
                  onChange={handleChange} className="form-input dl-input" style={inputOverride}
                >
                  <option value="">Válassz típust</option>
                  {PROJECT_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <FieldError message={errors.projectType} />
              </div>
              <div>
                <FieldLabel htmlFor="roomCount">Érintett helyiségek száma</FieldLabel>
                <select
                  id="roomCount" name="roomCount" value={form.roomCount}
                  onChange={handleChange} className="form-input dl-input" style={inputOverride}
                >
                  <option value="">Válasszon</option>
                  {ROOM_COUNTS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <FieldError message={errors.roomCount} />
              </div>
              <div>
                <FieldLabel>Stílusirányzat</FieldLabel>
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
                <FieldLabel htmlFor="timeline">Mikor szeretné elkezdeni?</FieldLabel>
                <select
                  id="timeline" name="timeline" value={form.timeline}
                  onChange={handleChange} className="form-input dl-input" style={inputOverride}
                >
                  <option value="">Válasszon időkeretet</option>
                  {TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <FieldError message={errors.timeline} />
              </div>

              {/* Design fee budget */}
              <div>
                <FieldLabel>Tervezői díjkeret</FieldLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {DESIGN_FEE_BRACKETS.map((bracket) => {
                    const checked = form.designBudgetHuf === bracket
                    return (
                      <label key={bracket} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', padding: '11px 14px', borderRadius: 2, border: `1px solid ${checked ? 'var(--dl-accent)' : 'var(--dl-border-accent)'}`, background: checked ? 'var(--dl-accent-subtle)' : 'transparent', transition: 'all 0.2s ease' }}>
                        <input type="radio" name="designBudgetHuf" value={bracket} checked={checked} onChange={handleChange} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                        <span style={{ fontSize: 13, color: checked ? 'var(--dl-text-primary)' : 'rgba(237,229,208,0.65)', fontFamily: 'var(--font-montserrat)', fontWeight: 200, transition: 'color 0.2s ease' }}>{bracket}</span>
                        <span style={{ width: 6, height: 6, minWidth: 6, borderRadius: '50%', border: `1px solid ${checked ? 'var(--dl-accent)' : 'var(--dl-accent-dim)'}`, background: checked ? 'var(--dl-accent)' : 'transparent', flexShrink: 0, transition: 'all 0.2s ease' }} />
                      </label>
                    )
                  })}
                </div>
                <FieldError message={errors.designBudgetHuf} />
              </div>

              {/* Fit-out planned */}
              <div>
                <FieldLabel>Tervezi a kivitelezést / bútorozást is?</FieldLabel>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {([['yes', 'Igen'], ['no', 'Nem']] as ['yes'|'no', string][]).map(([val, label]) => {
                    const checked = form.fitoutPlanned === val
                    return (
                      <label key={val} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', padding: '11px 14px', borderRadius: 2, border: `1px solid ${checked ? 'var(--dl-accent)' : 'var(--dl-border-accent)'}`, background: checked ? 'var(--dl-accent-subtle)' : 'transparent', transition: 'all 0.2s ease' }}>
                        <input type="radio" name="fitoutPlanned" value={val} checked={checked} onChange={handleChange} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                        <span style={{ fontSize: 13, color: checked ? 'var(--dl-text-primary)' : 'rgba(237,229,208,0.65)', fontFamily: 'var(--font-montserrat)', fontWeight: 200, transition: 'color 0.2s ease' }}>{label}</span>
                      </label>
                    )
                  })}
                </div>
                <FieldError message={errors.fitoutPlanned} />
              </div>

              {/* Conditional fit-out budget */}
              {form.fitoutPlanned === 'yes' && (
                <div>
                  <FieldLabel>Kivitelezési / bútorozási keret</FieldLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {DESIGN_FEE_BRACKETS.map((bracket) => {
                      const checked = form.fitoutBudgetHuf === bracket
                      return (
                        <label key={bracket} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', padding: '11px 14px', borderRadius: 2, border: `1px solid ${checked ? 'var(--dl-accent)' : 'var(--dl-border-accent)'}`, background: checked ? 'var(--dl-accent-subtle)' : 'transparent', transition: 'all 0.2s ease' }}>
                          <input type="radio" name="fitoutBudgetHuf" value={bracket} checked={checked} onChange={handleChange} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                          <span style={{ fontSize: 13, color: checked ? 'var(--dl-text-primary)' : 'rgba(237,229,208,0.65)', fontFamily: 'var(--font-montserrat)', fontWeight: 200, transition: 'color 0.2s ease' }}>{bracket}</span>
                          <span style={{ width: 6, height: 6, minWidth: 6, borderRadius: '50%', border: `1px solid ${checked ? 'var(--dl-accent)' : 'var(--dl-accent-dim)'}`, background: checked ? 'var(--dl-accent)' : 'transparent', flexShrink: 0, transition: 'all 0.2s ease' }} />
                        </label>
                      )
                    })}
                  </div>
                  <FieldError message={errors.fitoutBudgetHuf} />
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Fotók & részletek ─────────────────────────── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Photo upload */}
              <div>
                <FieldLabel>
                  Fotók feltöltése{' '}
                  <span style={{ color: 'var(--dl-accent-dim)', textTransform: 'none', letterSpacing: 0, fontWeight: 200 }}>
                    — Tölts fel 1–3 fotót a helyiségről (kötelező)
                  </span>
                </FieldLabel>
                <input
                  ref={fileInputRef} type="file" accept="image/jpeg,image/png" multiple
                  onChange={handleFileInput} style={{ display: 'none' }} aria-label="Fotók feltöltése"
                />
                {photos.length < 3 && (
                  <div
                    role="button" tabIndex={0} aria-label="Kattints vagy húzd ide a fotókat"
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
                      {isDragging ? 'Engedd el a fotókat' : 'Húzd ide a fotókat, vagy kattints a tallózáshoz'}
                    </p>
                    {photos.length > 0 && (
                      <p style={{ color: 'var(--dl-accent)', fontSize: 12, margin: '4px 0 0', fontFamily: 'var(--font-montserrat)', fontWeight: 300 }}>
                        {photos.length} {photos.length === 1 ? 'fotó kiválasztva' : 'fotó kiválasztva'}
                      </p>
                    )}
                    <p style={{ color: 'rgba(237,229,208,0.2)', fontSize: 12, margin: '4px 0 0', fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
                      JPEG vagy PNG · max 5 MB/db · legfeljebb 3 fotó
                    </p>
                  </div>
                )}
                {photos.length > 0 && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                    {photos.map((item, i) => (
                      <div key={i} style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.preview} alt={`Helyiség fotó ${i + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2, border: '1px solid var(--dl-border-accent)', display: 'block' }}
                        />
                        <button
                          type="button" onClick={() => removePhoto(i)} aria-label={`Fotó eltávolítása ${i + 1}`}
                          style={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: '50%', background: 'var(--dl-accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dl-bg-page)', fontSize: 12, fontWeight: 700, lineHeight: 1, padding: 0 }}
                        >×</button>
                      </div>
                    ))}
                    {photos.length < 3 && (
                      <button
                        type="button" onClick={() => fileInputRef.current?.click()}
                        style={{ width: 88, height: 88, borderRadius: 2, border: '1px dashed var(--dl-border-accent)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dl-accent-dim)', fontSize: 22, transition: 'border-color 0.2s ease', flexShrink: 0 }}
                        aria-label="További fotó hozzáadása"
                      >+</button>
                    )}
                  </div>
                )}
                <FieldError message={photoError} />
              </div>

              {/* Additional info */}
              <div>
                <FieldLabel htmlFor="additionalInfo">
                  Egyéb megjegyzés{' '}
                  <span style={{ color: 'var(--dl-accent-dim)', textTransform: 'none', letterSpacing: 0, fontWeight: 200 }}>(opcionális)</span>
                </FieldLabel>
                <textarea
                  id="additionalInfo" name="additionalInfo" rows={4}
                  value={form.additionalInfo} onChange={handleChange}
                  placeholder="Bármilyen egyéb információ, ami segíthet a tervezőnek..."
                  className="form-input dl-input" style={inputOverride}
                />
              </div>

              {/* Error messages */}
              {submitAttempted && Object.keys(errors).length > 0 && status !== 'loading' && (
                <p style={{ color: 'rgba(220, 130, 90, 0.9)', fontSize: 12, fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
                  Kérjük, ellenőrizd a fenti mezőket — néhány kötelező adat hiányzik.
                </p>
              )}
              {status === 'error' && (
                <p style={{ color: 'rgba(220, 130, 90, 0.9)', fontSize: 12, fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>
                  Hiba történt. Kérjük, próbáld újra.
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
              >Vissza</button>
            )}
            {step < 3 ? (
              <button
                type="button" onClick={nextStep}
                style={{ flex: 1, background: 'var(--dl-accent)', color: 'var(--dl-bg-page)', fontWeight: 400, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, padding: '16px 24px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-montserrat)' }}
                className="dl-btn-primary"
              >
                Tovább →
              </button>
            ) : (
              <button
                type="submit" disabled={status === 'loading'}
                style={{ flex: 1, background: 'var(--dl-accent)', color: 'var(--dl-bg-page)', fontWeight: 400, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, padding: '16px 24px', border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer', opacity: status === 'loading' ? 0.8 : 1, fontFamily: 'var(--font-montserrat)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                className="dl-btn-primary"
              >
                {status === 'loading' ? 'Küldés...' : 'Küldés'}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  )
}
