'use client'

import { useState } from 'react'

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
type FormData = {
  name: string; email: string; studioName: string; portfolioUrl: string; bio: string
  responseTone: string; styleKeywords: string; typicalProjectSize: string
  ratePerSqm: string; calendlyUrl: string; password: string; confirmPassword: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

type SuccessData = { slug: string; intakeUrl: string; dashboardUrl: string; password: string }

/* ── Password strength ───────────────────────────────────────────── */
type Strength = 'none' | 'weak' | 'fair' | 'strong'

function getStrength(pw: string): Strength {
  if (!pw) return 'none'
  const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(pw)).length
  if (pw.length < 6 || variety < 2) return 'weak'
  if (pw.length < 12 || variety < 3) return 'fair'
  return 'strong'
}

const STRENGTH_COLOR: Record<Strength, string> = { none: T.borderDefault, weak: '#C0614A', fair: T.accent, strong: '#8A9E8C' }
const STRENGTH_LABEL: Record<Strength, string>  = { none: '', weak: 'Gyenge', fair: 'Megfelelő', strong: 'Erős' }

/* ── Helpers ─────────────────────────────────────────────────────── */
function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 10, fontWeight: 300, letterSpacing: '0.14em', color: 'rgba(237,229,208,0.6)', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-montserrat)' }}>
      {children}
    </label>
  )
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p style={{ color: T.textMuted, fontSize: 12, marginTop: 6, fontFamily: 'var(--font-montserrat)', fontWeight: 200, lineHeight: 1.5 }}>{children}</p>
}

function SectionRule() {
  return <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(184,147,90,0.4) 0%, transparent 70%)', marginBottom: 20 }} />
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }
  return (
    <button type="button" onClick={copy} style={{ background: copied ? 'rgba(138,158,140,0.15)' : 'transparent', border: `1px solid ${copied ? 'rgba(138,158,140,0.5)' : T.accent}`, color: copied ? '#8A9E8C' : T.accent, borderRadius: 2, padding: '7px 14px', fontFamily: 'var(--font-montserrat)', fontSize: 9, fontWeight: 400, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}>
      {copied ? 'Másolva' : (label ?? 'Másolás')}
    </button>
  )
}

function UrlRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', color: 'rgba(184,147,90,0.7)', textTransform: 'uppercase', margin: '0 0 8px' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: T.bgElevated, border: `1px solid ${T.borderAccent}`, borderRadius: 2, padding: '9px 12px', flex: 1, overflow: 'hidden' }}>
          <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 12, fontWeight: 200, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{value}</span>
        </div>
        <CopyButton value={value} />
      </div>
    </div>
  )
}

/* ── Step pills ──────────────────────────────────────────────────── */
const STEPS = ['Bemutatkozás', 'A stílusod', 'Beállítások']

function StepPills({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: 36 }}>
      {STEPS.map((label, i) => {
        const idx = i + 1
        const done = idx < current
        const active = idx === current
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${active || done ? T.accent : T.borderDefault}`, background: done ? T.accent : active ? T.accentSubtle : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s ease' }}>
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4.2 7.2L8 3" stroke={T.bgCard} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (
                  <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 9, fontWeight: 400, color: active ? T.accent : T.textMuted }}>{idx}</span>
                )}
              </div>
              <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 8, fontWeight: 300, letterSpacing: '0.16em', textTransform: 'uppercase', color: active ? T.accent : done ? 'rgba(184,147,90,0.6)' : T.textMuted, whiteSpace: 'nowrap', transition: 'color 0.2s ease' }}>
                {label}
              </span>
            </div>
            {idx < STEPS.length && (
              <div style={{ flex: 1, height: 1, margin: '0 8px', marginBottom: 22, background: done ? T.accentDim : T.borderDefault, transition: 'background 0.2s ease' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Password strength bar ───────────────────────────────────────── */
function StrengthBar({ strength }: { strength: Strength }) {
  const color = STRENGTH_COLOR[strength]
  const segments = strength === 'none' ? 0 : strength === 'weak' ? 1 : strength === 'fair' ? 2 : 3
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
        {[1, 2, 3].map((n) => <div key={n} style={{ flex: 1, height: 2, borderRadius: 1, background: n <= segments ? color : T.borderDefault, transition: 'background 0.25s ease' }} />)}
      </div>
      {strength !== 'none' && <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', color, textTransform: 'uppercase' }}>{STRENGTH_LABEL[strength]}</span>}
    </div>
  )
}

/* ── Tone radio ──────────────────────────────────────────────────── */
function ToneOption({ value, label, desc, checked, onChange }: { value: string; label: string; desc: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={checked ? 'radio-option radio-option--checked' : 'radio-option'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', padding: '11px 14px', borderRadius: 2, border: `1px solid ${checked ? T.accent : T.borderAccent}`, background: checked ? T.accentSubtle : 'transparent', transition: 'all 0.2s ease' }}>
      <input type="radio" name="responseTone" value={value} checked={checked} onChange={onChange} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      <div>
        <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 13, fontWeight: 200, color: checked ? T.textPrimary : 'rgba(237,229,208,0.65)', display: 'block' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, color: T.textMuted }}>{desc}</span>
      </div>
      <span style={{ width: 6, height: 6, minWidth: 6, borderRadius: '50%', border: `1px solid ${checked ? T.accent : T.accentDim}`, background: checked ? T.accent : 'transparent', flexShrink: 0, transition: 'all 0.2s ease' }} />
    </label>
  )
}

/* ── NavButtons ──────────────────────────────────────────────────── */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ background: 'transparent', border: `1px solid ${T.borderAccent}`, color: T.textMuted, borderRadius: 2, padding: '14px 24px', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 300, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s ease' }}>
      Vissza
    </button>
  )
}

/* ── Main ────────────────────────────────────────────────────────── */
export default function OnboardForm() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>({
    name: '', email: '', studioName: '', portfolioUrl: '', bio: '',
    responseTone: '', styleKeywords: '', typicalProjectSize: '', ratePerSqm: '',
    calendlyUrl: '', password: '', confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [status, setStatus]     = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [successData, setSuccessData] = useState<SuccessData | null>(null)

  const strength = getStrength(form.password)

  function handleChange(ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = ev.target
    setForm((p) => ({ ...p, [name]: value }))
    if (name === 'password' || name === 'confirmPassword') setPasswordError('')
  }

  const canAdvance1 = form.name.trim() !== '' && form.email.trim() !== ''

  function validatePasswords(): boolean {
    if (form.password.length < 8) { setPasswordError('A jelszó legalább 8 karakterből kell álljon.'); return false }
    if (form.password !== form.confirmPassword) { setPasswordError('A két jelszó nem egyezik.'); return false }
    return true
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validatePasswords()) return
    setStatus('loading')
    setErrorMsg('')
    const keywords = form.styleKeywords.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 5)
    try {
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email,
          studioName: form.studioName || undefined, portfolioUrl: form.portfolioUrl || undefined,
          styleKeywords: keywords, typicalProjectSize: form.typicalProjectSize || undefined,
          ratePerSqm: form.ratePerSqm || undefined, bio: form.bio || undefined,
          responseTone: form.responseTone || undefined, calendlyUrl: form.calendlyUrl || undefined,
          password: form.password,
        }),
      })
      if (!res.ok) {
        let message = 'Valami hiba történt.'
        try { const d = await res.json(); message = d.error || message } catch { /* ignore */ }
        throw new Error(message)
      }
      const data = await res.json()
      setSuccessData({ slug: data.slug, intakeUrl: data.intakeUrl, dashboardUrl: data.dashboardUrl, password: form.password })
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Valami hiba történt.')
      setStatus('error')
    }
  }

  const pageStyle: React.CSSProperties = { background: `radial-gradient(ellipse at center, #181510 0%, ${T.bgPage} 70%)`, minHeight: '100vh' }
  const cardStyle: React.CSSProperties = { background: T.bgCard, border: `1px solid ${T.borderAccent}`, borderRadius: 6, width: '100%', maxWidth: 600 }

  /* ── Success ─────────────────────────────────────────────────────── */
  if (status === 'success' && successData) {
    return (
      <div style={pageStyle} className="flex items-center justify-center px-4 py-16">
        <div style={{ ...cardStyle, padding: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="13" stroke={T.accent} strokeWidth="1.5" opacity="0.35" />
              <path d="M8 14L12 18L20 10" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 24, fontWeight: 400, color: T.textPrimary, marginBottom: 8, letterSpacing: '0.02em', textAlign: 'center' }}>
            Élő vagy
          </h2>
          <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.7, textAlign: 'center', fontFamily: 'var(--font-montserrat)', fontWeight: 200, marginBottom: 36 }}>
            Ezt a linket küldd az ügyfeleidnek. Innen kezeled a leadjeidet. Mentsd el mindkét linket.
          </p>
          <div style={{ marginBottom: 28 }}>
            <UrlRow label="Ügyfél-intake link" value={successData.intakeUrl} />
            <UrlRow label="A dashboardod"      value={successData.dashboardUrl} />
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 9, fontWeight: 300, letterSpacing: '0.2em', color: 'rgba(184,147,90,0.7)', textTransform: 'uppercase', margin: '0 0 8px' }}>Dashboard jelszó</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: T.bgElevated, border: '1px solid rgba(192,97,74,0.3)', borderRadius: 2, padding: '9px 12px', flex: 1 }}>
                  <span style={{ fontFamily: 'var(--font-montserrat)', fontSize: 13, fontWeight: 200, color: T.textPrimary, letterSpacing: '0.04em', display: 'block' }}>{successData.password}</span>
                </div>
                <CopyButton value={successData.password} />
              </div>
              <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 11, fontWeight: 200, color: 'rgba(192,97,74,0.7)', marginTop: 6 }}>Mentsd el — többet nem jelenik meg.</p>
            </div>
          </div>
          <a href={successData.dashboardUrl} style={{ display: 'block', width: '100%', background: T.accent, color: T.bgPage, fontWeight: 400, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 2, padding: '16px 24px', textDecoration: 'none', textAlign: 'center', fontFamily: 'var(--font-montserrat)', boxSizing: 'border-box' }} className="dl-btn-primary">
            Ugrás a dashboardra
          </a>
        </div>
      </div>
    )
  }

  /* ── Form ────────────────────────────────────────────────────────── */
  return (
    <div style={pageStyle} className="flex items-center justify-center px-4 py-16">
      <div style={cardStyle}>

        <div className="card-header" style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 32, fontWeight: 400, letterSpacing: '0.02em', color: T.textPrimary, margin: '0 0 8px', lineHeight: 1.1 }}>
            Designer profil
          </h1>
          <p style={{ fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 200, color: T.textMuted, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 20px' }}>
            Ez határozza meg, hogyan írja az AI a leadjeidet
          </p>
          <div style={{ height: 1, width: 40, background: T.accentDim, margin: '0 auto' }} />
        </div>

        <div className="card-body">
          <StepPills current={step} />

          <form onSubmit={handleSubmit} noValidate>

            {/* Step 1 */}
            {step === 1 && (
              <div style={{ animation: 'dl-fade-in 0.25s ease both' }}>
                <SectionRule />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <FieldLabel htmlFor="name">Megjelenítési név *</FieldLabel>
                    <input id="name" name="name" type="text" value={form.name} onChange={handleChange} placeholder="pl. Kovács Anna" className="form-input" required />
                  </div>
                  <div>
                    <FieldLabel htmlFor="email">E-mail cím *</FieldLabel>
                    <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="pl. hello@studiod.hu" className="form-input" required />
                    <FieldHint>Ide érkeznek az új lead értesítők. Az ügyfelek nem látják.</FieldHint>
                  </div>
                  <div>
                    <FieldLabel htmlFor="studioName">Stúdió neve</FieldLabel>
                    <input id="studioName" name="studioName" type="text" value={form.studioName} onChange={handleChange} placeholder="pl. Kovács Anna Belsőépítész Stúdió" className="form-input" />
                    <FieldHint>Megjelenik az e-mail tárgyában és az ügyfél eredményoldalán. Ebből generálódik az egyedi URL-ed.</FieldHint>
                  </div>
                  <div>
                    <FieldLabel htmlFor="portfolioUrl">Portfólió URL</FieldLabel>
                    <input id="portfolioUrl" name="portfolioUrl" type="url" value={form.portfolioUrl} onChange={handleChange} placeholder="https://portfoliod.hu" className="form-input" />
                  </div>
                  <div>
                    <FieldLabel htmlFor="bio">Rövid bemutatkozó <span style={{ color: T.accentDim, textTransform: 'none', letterSpacing: 0, fontWeight: 200 }}>(opcionális)</span></FieldLabel>
                    <textarea id="bio" name="bio" rows={3} value={form.bio} onChange={handleChange} placeholder="2–3 mondat a tervezői szemléletedről…" className="form-input" />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
                  <button type="button" onClick={() => setStep(2)} disabled={!canAdvance1} className="dl-btn-primary" style={{ background: T.accent, color: T.bgPage, border: 'none', borderRadius: 2, padding: '14px 28px', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 400, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: canAdvance1 ? 'pointer' : 'not-allowed', opacity: canAdvance1 ? 1 : 0.5, transition: 'all 0.2s ease' }}>
                    Következő
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div style={{ animation: 'dl-fade-in 0.25s ease both' }}>
                <SectionRule />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <FieldLabel>Válasz hangvétele *</FieldLabel>
                    <FieldHint>Milyen stílusban szóljon az AI az ügyfeleidhez?</FieldHint>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                      {[
                        { value: 'warm',         label: 'Meleg és személyes',        desc: 'Barátságos, az ügyfél nevét gyakran használja' },
                        { value: 'professional', label: 'Professzionális és tömör', desc: 'Üzletszerű, közvetlen, lényegre törő' },
                        { value: 'enthusiastic', label: 'Lelkes és design-fókuszú',  desc: 'Szenvedélyes, kifejező, kreatív' },
                      ].map((opt) => (
                        <ToneOption key={opt.value} value={opt.value} label={opt.label} desc={opt.desc} checked={form.responseTone === opt.value} onChange={() => setForm((p) => ({ ...p, responseTone: opt.value }))} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <FieldLabel htmlFor="styleKeywords">Stíluskulcsszavak</FieldLabel>
                    <input id="styleKeywords" name="styleKeywords" type="text" value={form.styleKeywords} onChange={handleChange} placeholder="pl. minimalista, meleg árnyalatok, természetes anyagok, Japandi" className="form-input" />
                    <FieldHint>Max 5 kulcsszó, vesszővel elválasztva. Minden briefbe bekerülnek.</FieldHint>
                  </div>
                  <div>
                    <FieldLabel htmlFor="typicalProjectSize">Tipikus projektméret</FieldLabel>
                    <input id="typicalProjectSize" name="typicalProjectSize" type="text" value={form.typicalProjectSize} onChange={handleChange} placeholder="pl. 20–80 m²" className="form-input" />
                  </div>
                  <div>
                    <FieldLabel htmlFor="ratePerSqm">Árkategória (m²-enként)</FieldLabel>
                    <input id="ratePerSqm" name="ratePerSqm" type="text" value={form.ratePerSqm} onChange={handleChange} placeholder="pl. 15 000–25 000 Ft/m²" className="form-input" />
                    <FieldHint>Az AI ezzel méri fel, hogy az ügyfél büdzséje reális-e az áraidhoz képest.</FieldHint>
                  </div>
                  <div>
                    <FieldLabel htmlFor="calendlyUrl">Foglalási link <span style={{ color: T.accentDim, textTransform: 'none', letterSpacing: 0, fontWeight: 200 }}>(opcionális)</span></FieldLabel>
                    <input id="calendlyUrl" name="calendlyUrl" type="url" value={form.calendlyUrl} onChange={handleChange} placeholder="https://calendly.com/nevem" className="form-input" />
                    <FieldHint>Calendly, Cal.com vagy bármilyen foglalási oldal. Az ügyfél az eredményoldalán látja.</FieldHint>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                  <BackButton onClick={() => setStep(1)} />
                  <button type="button" onClick={() => setStep(3)} className="dl-btn-primary" style={{ background: T.accent, color: T.bgPage, border: 'none', borderRadius: 2, padding: '14px 28px', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 400, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                    Következő
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div style={{ animation: 'dl-fade-in 0.25s ease both' }}>
                <SectionRule />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <FieldLabel htmlFor="password">Dashboard jelszó *</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <input id="password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} placeholder="Legalább 8 karakter" className="form-input" style={{ paddingRight: 52 }} required />
                      <button type="button" onClick={() => setShowPassword((v) => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, fontSize: 11, fontFamily: 'var(--font-montserrat)', fontWeight: 300, letterSpacing: '0.08em', padding: 4 }}>
                        {showPassword ? 'Elrejt' : 'Mutat'}
                      </button>
                    </div>
                    <StrengthBar strength={strength} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="confirmPassword">Jelszó megerősítése *</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <input id="confirmPassword" name="confirmPassword" type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={handleChange} placeholder="Ismételd meg a jelszót" className="form-input" style={{ paddingRight: 52 }} required />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, fontSize: 11, fontFamily: 'var(--font-montserrat)', fontWeight: 300, letterSpacing: '0.08em', padding: 4 }}>
                        {showConfirm ? 'Elrejt' : 'Mutat'}
                      </button>
                    </div>
                    {passwordError && <p style={{ color: 'rgba(220,130,90,0.9)', fontSize: 12, marginTop: 6, fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>{passwordError}</p>}
                  </div>
                </div>

                {status === 'error' && <p style={{ color: 'rgba(220,130,90,0.9)', fontSize: 12, marginTop: 20, fontFamily: 'var(--font-montserrat)', fontWeight: 200 }}>{errorMsg}</p>}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                  <BackButton onClick={() => setStep(2)} />
                  <button type="submit" disabled={status === 'loading'} className="dl-btn-primary" style={{ background: T.accent, color: T.bgPage, border: 'none', borderRadius: 2, padding: '14px 28px', fontFamily: 'var(--font-montserrat)', fontSize: 10, fontWeight: 400, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: status === 'loading' ? 'not-allowed' : 'pointer', opacity: status === 'loading' ? 0.7 : 1, transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {status === 'loading' ? (<><span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" /></>) : 'Profil létrehozása'}
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  )
}
