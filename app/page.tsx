import Link from 'next/link'

export default function RootPage() {
  return (
    <div style={{ ['--dl-accent' as string]: '#B8935A' }}>
      <style>{`
        :root {
          --dl-bg-page: #0F0D0A;
          --dl-bg-card: #181510;
          --dl-bg-elevated: #1A1710;
          --dl-accent: #B8935A;
          --dl-accent-dim: rgba(184,147,90,0.3);
          --dl-accent-subtle: rgba(184,147,90,0.12);
          --dl-text-primary: #EDE5D0;
          --dl-text-muted: rgba(237,229,208,0.35);
          --dl-border-default: rgba(255,255,255,0.05);
          --dl-border-accent: rgba(184,147,90,0.2);
        }
        @media (prefers-color-scheme: light) {
          :root {
            --dl-bg-page: #FAF7F2;
            --dl-bg-card: #FFFFFF;
            --dl-bg-elevated: #FAF7F2;
            --dl-text-primary: #1A1510;
            --dl-text-muted: rgba(26,21,16,0.45);
            --dl-border-default: rgba(184,147,90,0.2);
            --dl-border-accent: rgba(184,147,90,0.2);
          }
        }
        .landing-body {
          font-family: 'Montserrat', sans-serif;
          background-color: var(--dl-bg-page);
          color: var(--dl-text-primary);
          margin: 0;
        }
        .playfair { font-family: 'Playfair Display', serif; }
        .section-rule {
          height: 1px;
          background: linear-gradient(90deg, rgba(184,147,90,0.4) 0%, transparent 70%);
          margin-bottom: 2.5rem;
        }
      `}</style>

      <div className="landing-body">
        {/* Nav */}
        <nav style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.5rem 2rem',
        }}>
          <span className="playfair" style={{ fontSize: '1.375rem', color: '#FFEAAA', letterSpacing: '0.02em' }}>
            DesignLead
          </span>
          <Link
            href="/onboard"
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 400,
              fontSize: '0.8125rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#FFEAAA',
              border: '1px solid rgba(255,234,170,0.4)',
              borderRadius: '2px',
              padding: '0.5rem 1.25rem',
              textDecoration: 'none',
              transition: 'border-color 0.2s ease, background 0.2s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = '#FFEAAA'
              ;(e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,234,170,0.08)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,234,170,0.4)'
              ;(e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
            }}
          >
            Regisztráció
          </Link>
        </nav>

        {/* Hero */}
        <section style={{
          minHeight: '100vh',
          background: 'linear-gradient(45deg, #3B2222, #654328, #B59840, #FFEAAA)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '6rem 2rem 4rem',
        }}>
          <h1 className="playfair" style={{
            fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
            color: '#1A1510',
            fontWeight: 700,
            margin: '0 0 1.25rem',
            lineHeight: 1.15,
            maxWidth: '720px',
          }}>
            Az első benyomás a tied legyen.
          </h1>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 200,
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: 'rgba(26,21,16,0.75)',
            maxWidth: '540px',
            margin: '0 0 2.5rem',
            lineHeight: 1.6,
          }}>
            DesignLead automatizálja az ügyfél-minősítést, hogy te a tervezésre koncentrálhass.
          </p>
          <Link
            href="/onboard"
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 400,
              fontSize: '0.875rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#1A1510',
              background: '#FFFFFF',
              border: '1px solid rgba(26,21,16,0.15)',
              borderRadius: '2px',
              padding: '0.875rem 2.5rem',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'border-color 0.2s ease, background 0.2s ease',
            }}
          >
            Kezdés
          </Link>
          <p style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 300,
            fontSize: '0.75rem',
            color: 'rgba(26,21,16,0.45)',
            marginTop: '1.25rem',
            letterSpacing: '0.05em',
          }}>
            Nincs ingyenes csomag. Nincs felesleges funkció.
          </p>
        </section>

        {/* How it works */}
        <section style={{
          background: 'var(--dl-bg-page)',
          padding: '5rem 2rem',
          maxWidth: '1100px',
          margin: '0 auto',
        }}>
          <h2 className="playfair" style={{
            fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
            color: 'var(--dl-text-primary)',
            fontWeight: 700,
            marginBottom: '0.75rem',
          }}>
            Hogy működik?
          </h2>
          <div className="section-rule" />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '2rem',
          }}>
            {[
              {
                n: '01',
                title: 'Ügyfél kitölti az intake-formot',
                desc: 'Feltölti a fotókat, megadja az igényeit.',
              },
              {
                n: '02',
                title: 'AI minősíti a leadet',
                desc: 'Automatikus brief, minőségi besorolás, válaszvázlat.',
              },
              {
                n: '03',
                title: 'Te csak a jó ügyfelekkel foglalkozol',
                desc: 'A dashboardon minden rendezetten vár.',
              },
            ].map(step => (
              <div key={step.n} style={{
                borderLeft: '2px solid var(--dl-accent)',
                paddingLeft: '1.5rem',
              }}>
                <span className="playfair" style={{
                  fontSize: '2rem',
                  color: 'var(--dl-accent)',
                  fontWeight: 700,
                  display: 'block',
                  marginBottom: '0.75rem',
                }}>
                  {step.n}
                </span>
                <h3 style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 400,
                  fontSize: '0.9375rem',
                  color: 'var(--dl-text-primary)',
                  margin: '0 0 0.5rem',
                  letterSpacing: '0.02em',
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 200,
                  fontSize: '0.875rem',
                  color: 'var(--dl-text-muted)',
                  margin: 0,
                  lineHeight: 1.6,
                }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section style={{
          background: 'var(--dl-bg-elevated)',
          padding: '5rem 2rem',
        }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <h2 className="playfair" style={{
              fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
              color: 'var(--dl-text-primary)',
              fontWeight: 700,
              marginBottom: '0.75rem',
            }}>
              Mit kapsz?
            </h2>
            <div className="section-rule" />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}>
              {[
                {
                  title: 'AI lead brief',
                  desc: 'Minden beküldésből strukturált összefoglaló, automatikusan.',
                },
                {
                  title: 'Válaszvázlat',
                  desc: 'Kész e-mail tervezet, amit csak át kell nézni és elküldeni.',
                },
                {
                  title: 'Branded intake oldal',
                  desc: 'Saját URL-en, a te neved alatt.',
                },
              ].map(f => (
                <div key={f.title} style={{
                  background: 'var(--dl-bg-card)',
                  border: '1px solid var(--dl-border-default)',
                  borderRadius: '6px',
                  padding: '2rem',
                  transition: 'border-color 0.2s ease, background 0.2s ease',
                }}>
                  <h3 style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 400,
                    fontSize: '0.9375rem',
                    color: 'var(--dl-text-primary)',
                    margin: '0 0 0.75rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}>
                    {f.title}
                  </h3>
                  <p style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 200,
                    fontSize: '0.875rem',
                    color: 'var(--dl-text-muted)',
                    margin: 0,
                    lineHeight: 1.65,
                  }}>
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section style={{
          background: 'var(--dl-bg-page)',
          padding: '5rem 2rem',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 className="playfair" style={{
              fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
              color: 'var(--dl-text-primary)',
              fontWeight: 700,
              marginBottom: '0.75rem',
            }}>
              Árak
            </h2>
            <div className="section-rule" />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2.5rem',
            }}>
              {/* Alap */}
              <div style={{
                background: 'var(--dl-bg-card)',
                border: '1px solid var(--dl-border-default)',
                borderRadius: '6px',
                padding: '2rem',
              }}>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 300,
                  fontSize: '0.6875rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--dl-text-muted)',
                  margin: '0 0 0.5rem',
                }}>
                  Csomag
                </p>
                <h3 className="playfair" style={{
                  fontSize: '1.75rem',
                  color: 'var(--dl-text-primary)',
                  fontWeight: 700,
                  margin: '0 0 0.5rem',
                }}>
                  Alap
                </h3>
                <p className="playfair" style={{
                  fontSize: '2rem',
                  color: 'var(--dl-accent)',
                  fontWeight: 700,
                  margin: '0 0 1.5rem',
                }}>
                  ~
                </p>
                <ul style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}>
                  {['Intake form', 'AI brief', 'AI válaszvázlat', 'Saját URL'].map(feat => (
                    <li key={feat} style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 200,
                      fontSize: '0.875rem',
                      color: 'var(--dl-text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                    }}>
                      <span style={{ color: 'var(--dl-accent)', fontSize: '0.75rem' }}>✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro */}
              <div style={{
                background: 'var(--dl-bg-card)',
                border: '1px solid var(--dl-border-accent)',
                borderRadius: '6px',
                padding: '2rem',
                position: 'relative',
              }}>
                <span style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 400,
                  fontSize: '0.625rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--dl-accent)',
                  border: '1px solid var(--dl-accent)',
                  borderRadius: '2px',
                  padding: '0.2rem 0.5rem',
                }}>
                  Hamarosan
                </span>
                <p style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 300,
                  fontSize: '0.6875rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--dl-text-muted)',
                  margin: '0 0 0.5rem',
                }}>
                  Csomag
                </p>
                <h3 className="playfair" style={{
                  fontSize: '1.75rem',
                  color: 'var(--dl-text-primary)',
                  fontWeight: 700,
                  margin: '0 0 0.5rem',
                }}>
                  Pro
                </h3>
                <p className="playfair" style={{
                  fontSize: '2rem',
                  color: 'var(--dl-accent)',
                  fontWeight: 700,
                  margin: '0 0 1.5rem',
                }}>
                  ~
                </p>
                <ul style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}>
                  {['Minden ami Alap', 'AI concept renderek'].map(feat => (
                    <li key={feat} style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: 200,
                      fontSize: '0.875rem',
                      color: 'var(--dl-text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                    }}>
                      <span style={{ color: 'var(--dl-accent)', fontSize: '0.75rem' }}>✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Link
                href="/onboard"
                style={{
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 400,
                  fontSize: '0.875rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: '#0F0D0A',
                  background: 'var(--dl-accent)',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '0.875rem 2.5rem',
                  textDecoration: 'none',
                  display: 'inline-block',
                  transition: 'background 0.2s ease',
                }}
              >
                Regisztráció
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          background: 'var(--dl-bg-page)',
          borderTop: '1px solid var(--dl-border-accent)',
          padding: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          maxWidth: '1100px',
          margin: '0 auto',
        }}>
          <span className="playfair" style={{
            fontSize: '1.125rem',
            color: 'var(--dl-text-primary)',
            fontWeight: 700,
          }}>
            DesignLead
          </span>
          <span style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 200,
            fontSize: '0.75rem',
            color: 'var(--dl-text-muted)',
            letterSpacing: '0.05em',
          }}>
            © 2025 DesignLead. Minden jog fenntartva.
          </span>
        </footer>
      </div>
    </div>
  )
}
