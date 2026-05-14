'use client'
import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import SpacioLogo from '@/components/SpacioLogo'
import dynamic from 'next/dynamic'
const DemoPreview = dynamic(
  () => import('@/components/landing/DemoPreview'),
  { ssr: false, loading: () => null }
)
import ThemeToggle from '@/components/ThemeToggle'

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1]
const DUR = 0.6

const scrollFade = (inView: boolean, delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
  transition: { duration: DUR, ease: EASE, delay },
})

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: DUR, ease: EASE, delay: i * 0.12 },
  }),
}

export default function RootPage() {
  const howRef = useRef(null)
  const howInView = useInView(howRef, { once: true, amount: 0.15 })
  const featRef = useRef(null)
  const featInView = useInView(featRef, { once: true, amount: 0.15 })
  const pricingRef = useRef(null)
  const pricingInView = useInView(pricingRef, { once: true, amount: 0.15 })
  const [billingAnnual, setBillingAnnual] = useState(false)

  return (
    <div>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .lb { font-family: 'Montserrat', sans-serif; background: transparent; color: var(--dl-text-primary); }
        .pf { font-family: 'Playfair Display', serif; }
        .rule { height: 1px; background: var(--dl-rule-gradient); margin-bottom: 32px; }

        .nav-cta {
          font-family:'Montserrat',sans-serif; font-weight:400; font-size:11px;
          letter-spacing:.14em; text-transform:uppercase; color:var(--dl-accent);
          border:1px solid var(--dl-accent-dim); border-radius:2px; padding:8px 16px;
          text-decoration:none; transition:border-color .2s ease,background .2s ease;
        }
        .nav-cta:hover { border-color:var(--dl-accent); background:var(--dl-accent-subtle); }

        .hero-cta {
          font-family:'Montserrat',sans-serif; font-weight:400; font-size:11px;
          letter-spacing:.2em; text-transform:uppercase; color:var(--dl-accent);
          background:transparent; border:1px solid var(--dl-accent); border-radius:2px;
          padding:12px 32px; text-decoration:none; display:inline-block;
          transition:background .2s ease,color .2s ease;
        }
        .hero-cta:hover { background:var(--dl-accent); color:var(--dl-bg-page); }

        .feat-card {
          background:var(--dl-bg-card); border:1px solid var(--dl-border-default);
          border-left:2px solid var(--dl-accent); border-radius:6px; padding:32px;
          transition:border-color .2s ease,background .2s ease;
        }
        .feat-card:hover { background:var(--dl-bg-elevated); border-color:var(--dl-border-accent); border-left-color:var(--dl-accent); }

        .price-card {
          background:var(--dl-bg-card); border-radius:6px; padding:32px;
          transition:border-color .2s ease;
        }
        .price-alap { border:1px solid var(--dl-accent); }
        .price-iroda { border:1px solid var(--dl-border-default); }
        .price-alap:hover,.price-iroda:hover { border-color:var(--dl-border-accent); }
        .price-alap:hover { border-color:var(--dl-accent); }

        .price-cta-alap {
          font-family:'Montserrat',sans-serif; font-weight:400; font-size:11px;
          letter-spacing:.14em; text-transform:uppercase; color:var(--dl-bg-page);
          background:var(--dl-accent); border:none; border-radius:2px; padding:10px 20px;
          text-decoration:none; display:inline-block;
          transition:background .2s ease;
        }
        .price-cta-alap:hover { background:var(--dl-accent-dim); }
        .price-cta-iroda {
          font-family:'Montserrat',sans-serif; font-weight:400; font-size:11px;
          letter-spacing:.14em; text-transform:uppercase; color:var(--dl-accent);
          background:transparent; border:1px solid var(--dl-accent-dim); border-radius:2px;
          padding:10px 20px; text-decoration:none; display:inline-block;
          transition:border-color .2s ease,background .2s ease;
        }
        .price-cta-iroda:hover { border-color:var(--dl-accent); background:var(--dl-accent-subtle); }

        @media (max-width: 768px) {
          .hero-text { max-width: 100% !important; }
          .nav-wrap { padding: 24px 24px !important; }
          .section-wrap { padding: 48px 24px !important; }
          .step-grid { grid-template-columns: 1fr !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
          .testi-grid { grid-template-columns: 1fr !important; }
          .price-grid { grid-template-columns: 1fr !important; }
          .nav-divider { display: none !important; }
          .nav-login { display: none !important; }
          .nav-reg { padding: 10px 14px !important; font-size: 11px !important; }
        }
      `}</style>

      <div className="lb">

        {/* ── Nav ─────────────────────────────────────────────────── */}
        <nav style={{
          position: 'relative',
          zIndex: 50,
          background: 'var(--dl-bg-page)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          animation: 'nav-in 600ms var(--ease) 100ms both',
        }}>
          <div style={{ alignSelf: 'flex-start', marginTop: '-5px' }}>
            <SpacioLogo height={130} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThemeToggle />
            <a href="/dashboard" className="nav-login" style={{
              fontFamily: 'var(--font-montserrat)',
              fontSize: 13,
              fontWeight: 400,
              letterSpacing: '0.14em',
              textTransform: 'uppercase' as const,
              textDecoration: 'none',
              color: 'var(--dl-text-muted)',
              whiteSpace: 'nowrap' as const,
              padding: '14px 4px',
            }}>
              Bejelentkezés
            </a>
            <div className="nav-divider" style={{ width: 1, height: 16, background: 'var(--dl-border-default)', margin: '0 12px' }} />
            <a href="/onboard" className="nav-link nav-reg" style={{
              background: 'transparent',
              border: '1px solid var(--dl-accent)',
              color: 'var(--dl-accent)',
              borderRadius: 2,
              padding: '14px 28px',
              fontFamily: 'var(--font-montserrat)',
              fontSize: 13,
              fontWeight: 400,
              letterSpacing: '0.14em',
              textTransform: 'uppercase' as const,
              textDecoration: 'none',
              whiteSpace: 'nowrap' as const,
            }}>
              Regisztráció
            </a>
          </div>
        </nav>

        {/* ── Hero ────────────────────────────────────────────────── */}
        <section style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          padding: '120px 48px 80px',
          paddingTop: 80,
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
            <div className="hero-grid" style={{ display: 'flex', alignItems: 'center', gap: 64, flexWrap: 'wrap' }}>

              {/* Left — text */}
              <div className="hero-text" style={{ flex: '1 1 400px', maxWidth: 540 }}>

                {/* Thread — thin accent line */}
                <div style={{
                  width: 40,
                  height: 1,
                  background: 'var(--dl-accent)',
                  marginBottom: 16,
                  transformOrigin: 'left',
                  animation: 'thread-in 600ms var(--ease) 200ms both',
                }} />

                <h1 className="pf" style={{ fontWeight: 400, lineHeight: 1.2, marginBottom: 24 }}>
                  <span style={{ display: 'block', fontSize: 'clamp(28px, 3.5vw, 40px)', color: 'var(--dl-text-primary)', wordBreak: 'normal', whiteSpace: 'normal', animation: `word-in 600ms var(--ease) 400ms both` }}>
                    Minden érdeklődőből minősített ügyfél.
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 'clamp(28px, 3.5vw, 40px)',
                      color: 'var(--dl-accent)',
                      animation: `word-in 600ms var(--ease) ${400 + 4 * 70}ms both`,
                    }}
                  >
                    Automatikusan.
                  </span>
                </h1>

                {/* Horizontal rule — rule-in */}
                <div style={{
                  width: 64,
                  height: 1,
                  background: 'var(--dl-rule-gradient)',
                  marginBottom: 24,
                  transformOrigin: 'left',
                  animation: 'rule-in 800ms var(--ease) 500ms both',
                }} />

                {/* Subline */}
                <p
                  style={{
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 200, fontSize: 15,
                    color: 'var(--dl-text-muted)', lineHeight: 1.8, marginBottom: 48,
                    animation: 'cascade 720ms var(--ease) 1200ms both',
                  }}
                >
                  Az ügyfél kitölti az űrlapot — 60 másodperc alatt megtudod, megéri-e a projekten dolgozni, és milyen díjat érdemes ajánlani.
                </p>

                {/* CTAs */}
                <div style={{ animation: 'cascade 720ms var(--ease) 1400ms both' }}>
                  <Link href="/onboard" className="hero-cta">Kezdd el →</Link>
                </div>
              </div>

              {/* Right — static lead card mockup inside phone frame */}
              <div style={{ flex: '0 1 320px', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'card-in 800ms var(--ease) 800ms both' }}>
                {/* Phone shell */}
                <div style={{
                  width: 320,
                  borderRadius: 36,
                  border: '2px solid rgba(255,255,255,0.08)',
                  background: 'var(--dl-bg-page)',
                  boxShadow: '0 0 0 1px rgba(184,147,90,0.15), 0 32px 64px rgba(0,0,0,0.5)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {/* Notch bar */}
                  <div style={{
                    height: 8,
                    background: 'var(--dl-bg-page)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    flexShrink: 0,
                  }} />
                  {/* Scrollable card area */}
                  <div style={{
                    padding: '16px 16px 20px',
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                    borderRadius: '0 0 28px 28px',
                  }}>
                    <div className="mock-card">
                      {/* Card header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                          <div style={{
                            fontFamily: 'Montserrat, sans-serif', fontSize: 18, fontWeight: 300,
                            color: 'var(--dl-text-primary)', marginBottom: 4,
                          }}>
                            Kovács Anna
                          </div>
                          <div style={{
                            fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 300,
                            color: 'var(--dl-text-muted)',
                          }}>
                            Nappali, 28 m²
                          </div>
                        </div>
                        <span className="mock-badge">Magas</span>
                      </div>

                      {/* Divider */}
                      <div style={{ height: 1, background: 'var(--dl-border-default)', marginBottom: 16 }} />

                      {/* Brief excerpt */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{
                          fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 300,
                          letterSpacing: '0.14em', textTransform: 'uppercase',
                          color: 'var(--dl-accent)', marginBottom: 8,
                        }}>
                          AI Brief
                        </div>
                        <p style={{
                          fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 200,
                          color: 'var(--dl-text-muted)', lineHeight: 1.65, margin: 0,
                        }}>
                          Skandináv-minimalista nappali, természetes anyagok, semleges paletta. Büdzsé illeszkedés: kiváló — a 800 000 Ft-os keret reális.
                        </p>
                      </div>

                      {/* Action button */}
                      <button className="mock-btn">Válasz e-mail másolása</button>
                    </div>
                  </div>
                </div>
                {/* Caption */}
                <p style={{
                  fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 300,
                  color: 'rgba(237,229,208,0.35)', marginTop: 12, textAlign: 'center',
                  letterSpacing: '0.04em',
                }}>
                  Így jelenik meg az irányítópulton
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────── */}
        <section className="section-wrap" style={{ background: 'var(--dl-bg-elevated)', padding: '80px 48px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <motion.div ref={howRef} {...scrollFade(howInView)}>
              <p style={{
                fontFamily: 'Montserrat, sans-serif', fontWeight: 300, fontSize: 11,
                letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--dl-accent)', marginBottom: 12,
              }}>Folyamat</p>
              <h2 className="pf" style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 400, color: 'var(--dl-text-primary)', marginBottom: 12 }}>
                Hogy működik?
              </h2>
              <div className="rule" />
            </motion.div>

            <div className="step-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40 }}>
              {[
                {
                  n: '01',
                  title: 'Az ügyfél kitölti az űrlapot',
                  desc: 'Szobafotók, stílus, büdzsé, határidő — mind egy helyen.',
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M7 8h10M7 12h6M7 16h4" />
                    </svg>
                  ),
                },
                {
                  n: '02',
                  title: 'Az AI 60 mp alatt minősít',
                  desc: 'Projektösszefoglaló, büdzsé-illeszkedés, lead-minőség értékelés.',
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 3" />
                    </svg>
                  ),
                },
                {
                  n: '03',
                  title: 'Már tudod, mit ajánlj',
                  desc: 'Árajánlat-irány, lead-minőség, válaszvázlat — minden egy helyen, mielőtt felveszed a telefont.',
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8l9 6 9-6" />
                      <rect x="3" y="6" width="18" height="12" rx="2" />
                    </svg>
                  ),
                },
              ].map((step, i) => (
                <motion.div
                  key={step.n}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.15 }}
                  variants={cardVariants}
                  style={{ borderLeft: '2px solid var(--dl-accent)', paddingLeft: 24 }}
                >
                  <div style={{ color: 'var(--dl-accent)', marginBottom: 12 }}>{step.icon}</div>
                  <span className="pf" style={{
                    fontSize: 40, fontWeight: 400, color: 'var(--dl-accent)', display: 'block', marginBottom: 12, lineHeight: 1,
                  }}>{step.n}</span>
                  <h3 style={{
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 400, fontSize: 15,
                    color: 'var(--dl-text-primary)', margin: '0 0 8px',
                  }}>{step.title}</h3>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 200, fontSize: 13,
                    color: 'var(--dl-text-muted)', margin: 0, lineHeight: 1.65,
                  }}>{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <DemoPreview />

        {/* ── What you get ─────────────────────────────────────────── */}
        <section className="section-wrap" style={{ padding: '80px 48px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <motion.div ref={featRef} {...scrollFade(featInView)}>
              <p style={{
                fontFamily: 'Montserrat, sans-serif', fontWeight: 300, fontSize: 11,
                letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--dl-accent)', marginBottom: 12,
              }}>Funkciók</p>
              <h2 className="pf" style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 400, color: 'var(--dl-text-primary)', marginBottom: 12 }}>
                Mit kapsz?
              </h2>
              <div className="rule" />
            </motion.div>

            <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
              {[
                {
                  title: 'Projektösszefoglaló',
                  desc: 'Scope, stílus, ügyfélprofil — a feltöltött fotókból generálva.',
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  ),
                },
                {
                  title: 'Lead-minőség értékelés',
                  desc: 'Magas / Közepes / Alacsony — indoklással, mielőtt felveszed a telefont.',
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  ),
                },
                {
                  title: 'AI által írt válasz e-mail',
                  desc: 'Személyre szabva, a te hangnemédben — azonnal elküldhető.',
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8l9 6 9-6" />
                      <rect x="3" y="6" width="18" height="12" rx="2" />
                    </svg>
                  ),
                },
                {
                  title: 'Saját hangnemedben',
                  desc: 'Kedves és személyes, professzionális vagy lelkes — a rendszer a te stílusodban fogalmaz.',
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  ),
                },
              ].map((card, i) => (
                <motion.div
                  key={card.title}
                  className="feat-card"
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.15 }}
                  variants={cardVariants}
                >
                  <div style={{ color: 'var(--dl-accent)', marginBottom: 16 }}>{card.icon}</div>
                  <h3 style={{
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 400, fontSize: 15,
                    color: 'var(--dl-text-primary)', margin: '0 0 8px',
                  }}>{card.title}</h3>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif', fontWeight: 200, fontSize: 13,
                    color: 'var(--dl-text-muted)', margin: 0, lineHeight: 1.65,
                  }}>{card.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA bridge ───────────────────────────────────────────── */}
        <section className="section-wrap" style={{ padding: '40px 48px', textAlign: 'center' }}>
          <a href="#pricing" className="hero-cta">Nézd meg az árakat →</a>
        </section>

        {/* ── Pricing ──────────────────────────────────────────────── */}
        <section id="pricing" className="section-wrap" style={{ padding: '80px 48px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <motion.div ref={pricingRef} {...scrollFade(pricingInView)}>
              <p style={{
                fontFamily: 'Montserrat, sans-serif', fontWeight: 300, fontSize: 11,
                letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--dl-accent)', marginBottom: 12,
              }}>Árazás</p>
              <h2 className="pf" style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 400, color: 'var(--dl-text-primary)', marginBottom: 12 }}>
                Egyszerű árazás
              </h2>
              <div className="rule" />

              {/* Billing toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 400,
                  color: 'var(--dl-text-primary)', cursor: 'pointer',
                }} onClick={() => setBillingAnnual(false)}>Havi</span>
                <div onClick={() => setBillingAnnual(a => !a)} style={{
                  width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative',
                  background: billingAnnual ? 'rgba(184,147,90,0.4)' : 'rgba(184,147,90,0.15)',
                  border: '1px solid rgba(184,147,90,0.3)', transition: 'background .2s',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: 'var(--dl-accent)',
                    position: 'absolute', top: 2, left: 2,
                    transform: billingAnnual ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform .2s',
                  }} />
                </div>
                <span style={{
                  fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 400,
                  color: billingAnnual ? 'var(--dl-text-primary)' : 'var(--dl-text-muted)', cursor: 'pointer',
                }} onClick={() => setBillingAnnual(true)}>Éves</span>
                {billingAnnual && (
                  <span style={{
                    fontFamily: 'Montserrat, sans-serif', fontSize: 11, fontWeight: 300,
                    color: 'var(--dl-accent)', background: 'rgba(184,147,90,0.1)',
                    border: '1px solid rgba(184,147,90,0.2)', borderRadius: 2,
                    padding: '2px 8px', letterSpacing: '0.06em',
                  }}>2 hónap ingyen</span>
                )}
              </div>
            </motion.div>

            <div className="price-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>

              {/* Base */}
              <motion.div className="price-card price-iroda" custom={0} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={cardVariants}>
                <h3 className="pf" style={{ fontSize: 22, fontWeight: 400, color: 'var(--dl-text-primary)', margin: '0 0 4px' }}>Base</h3>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 200, fontSize: 12, color: 'var(--dl-text-muted)', margin: '0 0 20px' }}>Önálló tervezőknek</p>
                <p style={{ margin: '0 0 4px', lineHeight: 1 }}>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400, fontSize: 28, color: 'var(--dl-accent)' }}>
                    {billingAnnual ? '4 900' : '6 900'}
                  </span>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 200, fontSize: 13, color: 'var(--dl-text-muted)', marginLeft: 8 }}>HUF/hó</span>
                </p>
                {billingAnnual
                  ? <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: 'var(--dl-accent)', margin: '0 0 20px', fontWeight: 300 }}>Megtakarítás: 24 000 HUF/év</p>
                  : <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: 'var(--dl-text-muted)', margin: '0 0 20px', fontWeight: 200 }}>havonta számlázva</p>
                }
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                  {[
                    { label: '4 lead / hó', on: true },
                    { label: 'AI projektösszefoglaló', on: true },
                    { label: 'Lead-minőség értékelés', on: true },
                    { label: 'Díjirányzat', on: true },
                    { label: 'AI válasz e-mail draft', on: true },
                    { label: 'Digest értesítés', on: true },
                    { label: 'AI renderek', on: false },
                    { label: 'Branded eredményoldal', on: false },
                    { label: '5 felhasználói fiók', on: false },
                  ].map(f => (
                    <li key={f.label} style={{
                      fontFamily: 'Montserrat, sans-serif', fontWeight: 200, fontSize: 13,
                      color: f.on ? 'var(--dl-text-primary)' : 'rgba(237,229,208,0.2)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ color: f.on ? 'var(--dl-accent)' : 'rgba(184,147,90,0.2)', fontSize: 11, flexShrink: 0 }}>—</span>
                      {f.label}
                    </li>
                  ))}
                </ul>
                <Link href="/onboard" className="price-cta-iroda">Kezdd el →</Link>
              </motion.div>

              {/* Base Pro */}
              <motion.div className="price-card price-alap" custom={1} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={cardVariants} style={{ borderTop: '2px solid var(--dl-accent)', position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: -1, right: 16,
                  fontFamily: 'Montserrat, sans-serif', fontSize: 10, fontWeight: 400,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: 'var(--dl-accent)', color: 'var(--dl-bg-page)',
                  borderRadius: '0 0 2px 2px', padding: '3px 10px',
                }}>Ajánlott</div>
                <h3 className="pf" style={{ fontSize: 22, fontWeight: 400, color: 'var(--dl-text-primary)', margin: '0 0 4px' }}>Base Pro</h3>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 200, fontSize: 12, color: 'var(--dl-text-muted)', margin: '0 0 20px' }}>Tapasztalt önálló tervezőknek</p>
                <p style={{ margin: '0 0 4px', lineHeight: 1 }}>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400, fontSize: 28, color: 'var(--dl-accent)' }}>
                    {billingAnnual ? '11 900' : '14 900'}
                  </span>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 200, fontSize: 13, color: 'var(--dl-text-muted)', marginLeft: 8 }}>HUF/hó</span>
                </p>
                {billingAnnual
                  ? <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: 'var(--dl-accent)', margin: '0 0 20px', fontWeight: 300 }}>Megtakarítás: 36 000 HUF/év</p>
                  : <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: 'var(--dl-text-muted)', margin: '0 0 20px', fontWeight: 200 }}>havonta számlázva</p>
                }
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                  {[
                    { label: '15 lead / hó', on: true },
                    { label: 'AI projektösszefoglaló', on: true },
                    { label: 'Lead-minőség értékelés', on: true },
                    { label: 'Díjirányzat', on: true },
                    { label: 'AI válasz e-mail draft', on: true },
                    { label: 'Azonnali + digest értesítés', on: true },
                    { label: 'AI renderek', on: true },
                    { label: 'Branded eredményoldal', on: true },
                    { label: '5 felhasználói fiók', on: false },
                  ].map(f => (
                    <li key={f.label} style={{
                      fontFamily: 'Montserrat, sans-serif', fontWeight: 200, fontSize: 13,
                      color: f.on ? 'var(--dl-text-primary)' : 'rgba(237,229,208,0.2)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ color: f.on ? 'var(--dl-accent)' : 'rgba(184,147,90,0.2)', fontSize: 11, flexShrink: 0 }}>—</span>
                      {f.label}
                    </li>
                  ))}
                </ul>
                <Link href="/onboard" className="price-cta-alap">Kezdd el →</Link>
              </motion.div>

              {/* Studio */}
              <motion.div className="price-card price-iroda" custom={2} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={cardVariants}>
                <h3 className="pf" style={{ fontSize: 22, fontWeight: 400, color: 'var(--dl-text-primary)', margin: '0 0 4px' }}>Studio</h3>
                <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 200, fontSize: 12, color: 'var(--dl-text-muted)', margin: '0 0 20px' }}>Stúdióknak és nagy volumenű tervezőknek</p>
                <p style={{ margin: '0 0 4px', lineHeight: 1 }}>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400, fontSize: 28, color: 'var(--dl-accent)' }}>
                    {billingAnnual ? '24 900' : '29 900'}
                  </span>
                  <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 200, fontSize: 13, color: 'var(--dl-text-muted)', marginLeft: 8 }}>HUF/hó</span>
                </p>
                {billingAnnual
                  ? <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: 'var(--dl-accent)', margin: '0 0 20px', fontWeight: 300 }}>Megtakarítás: 60 000 HUF/év</p>
                  : <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 11, color: 'var(--dl-text-muted)', margin: '0 0 20px', fontWeight: 200 }}>havonta számlázva</p>
                }
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                  {[
                    { label: 'Korlátlan lead', on: true },
                    { label: 'AI projektösszefoglaló', on: true },
                    { label: 'Lead-minőség értékelés', on: true },
                    { label: 'Díjirányzat', on: true },
                    { label: 'AI válasz e-mail draft', on: true },
                    { label: 'Azonnali + digest értesítés', on: true },
                    { label: 'AI renderek', on: true },
                    { label: 'Branded eredményoldal', on: true },
                    { label: '5 felhasználói fiók', on: true },
                    { label: 'Prioritásos support', on: true },
                  ].map(f => (
                    <li key={f.label} style={{
                      fontFamily: 'Montserrat, sans-serif', fontWeight: 200, fontSize: 13,
                      color: 'var(--dl-text-primary)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ color: 'var(--dl-accent)', fontSize: 11, flexShrink: 0 }}>—</span>
                      {f.label}
                    </li>
                  ))}
                </ul>
                <a href="mailto:hello@spacio.app" className="price-cta-iroda">Kapcsolatfelvétel →</a>
              </motion.div>

            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <footer style={{
          borderTop: '1px solid var(--dl-border-default)',
          padding: '32px 48px',
          textAlign: 'center',
        }}>
          <span style={{
            fontFamily: 'Montserrat, sans-serif', fontWeight: 200, fontSize: 11,
            color: 'var(--dl-text-muted)', letterSpacing: '0.08em',
          }}>
            © 2026 Spacio · spacio.app
          </span>
        </footer>

      </div>
    </div>
  )
}
