'use client'

import { useEffect, useRef, useState } from 'react'

const STAGES   = ['ds1','ds2','ds3','ds4'] as const
const DURATIONS = [3800, 3400, 3800, 4200]
const URLS = [
  'spacio.app/a/uracs-studio',
  'spacio.app/processing/abc7f3',
  'spacio.app/dashboard/uracs-studio',
  'spacio.app/dashboard/uracs-studio/lead/anna-k',
]
const CURSOR_POS = [
  { left: '78%', top: '88%' },
  { left: '50%', top: '50%' },
  { left: '52%', top: '52%' },
  { left: '24%', top: '88%' },
]

export default function DemoPreview() {
  const [stage, setStage]           = useState(0)
  const [processSec, setProcessSec] = useState(0)
  const [recTime, setRecTime]       = useState('0:00')

  const stageRef      = useRef(0)
  const startedRef    = useRef(false)
  const advanceTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recTimer      = useRef<ReturnType<typeof setInterval> | null>(null)
  const procTimer     = useRef<ReturnType<typeof setInterval> | null>(null)
  const recSecs       = useRef(0)

  function clearAll() {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    if (recTimer.current)     clearInterval(recTimer.current)
    if (procTimer.current)    clearInterval(procTimer.current)
  }

  function goToStage(idx: number) {
    stageRef.current = idx
    setStage(idx)

    if (procTimer.current) { clearInterval(procTimer.current); procTimer.current = null }

    if (idx === 1) {
      setProcessSec(0)
      let ps = 0
      procTimer.current = setInterval(() => {
        ps = Math.min(ps + 4, 60)
        setProcessSec(ps)
      }, 200)
    }
  }

  function advance() {
    const next = (stageRef.current + 1) % STAGES.length
    goToStage(next)
    advanceTimer.current = setTimeout(advance, DURATIONS[next])
  }

  function startDemo() {
    if (startedRef.current) return
    startedRef.current = true
    goToStage(0)
    advanceTimer.current = setTimeout(advance, DURATIONS[0])
    recTimer.current = setInterval(() => {
      recSecs.current += 1
      const m = Math.floor(recSecs.current / 60)
      const s = recSecs.current % 60
      setRecTime(`${m}:${s < 10 ? '0' : ''}${s}`)
    }, 1000)
  }

  useEffect(() => {
    startDemo()
    return () => { clearAll() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isActive = (i: number) => stage === i ? 'demo-stage is-active' : 'demo-stage'

  return (
    <section id="spacio-demo" className="demo-section">
      <div className="demo-wrap">

        <div className="demo-header">
          <span className="demo-eyebrow">Hogyan néz ki valójában</span>
          <h2 className="demo-heading">
            Kilencven másodperc.<br/>
            <em>Aztán szokássá válik.</em>
          </h2>
          <p className="demo-lead">
            Nézd meg, ahogy egy érdeklődés űrlappá, briefé, és kész válaszlevéllé
            válik — és ott landol a stúdiód irányítópon.
          </p>
        </div>

        <div className="demo-window">

          {/* Chrome */}
          <div className="demo-chrome">
            <div className="chrome-dots">
              <span className="chrome-dot red" />
              <span className="chrome-dot yellow" />
              <span className="chrome-dot green" />
            </div>
            <div className="chrome-url">{URLS[stage]}</div>
            <div className="chrome-rec">
              <span className="rec-dot" />
              <span>{recTime}</span>
            </div>
          </div>

          {/* Screen */}
          <div className="demo-screen">

            {/* Cursor */}
            <div className="demo-cursor" style={CURSOR_POS[stage]}>
              <svg viewBox="0 0 20 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 2 L16.5 11.5 L10 13 L8 20 L4 2Z"
                      fill="#EDE5D0" stroke="#0F0D0A" strokeWidth="0.8"/>
              </svg>
            </div>

            {/* Stage 1 */}
            <div className={isActive(0)} id="ds1">
              <div className="stage-intake">
                <div className="intake-brand">
                  <div>
                    <div className="intake-studio">Uracs Studio<span className="dot">.</span></div>
                    <div className="intake-subtitle">Belsőépítészet · Budapest</div>
                  </div>
                  <div className="intake-steps">
                    <span className="step-i active">1 · Rólad</span>
                    <span className="step-i">2 · A térről</span>
                    <span className="step-i">3 · Képek</span>
                  </div>
                </div>
                <h3 className="intake-title">Mesélj a projektedről.</h3>
                <div className="intake-form">
                  <div className="intake-field">
                    <span className="intake-label">Név</span>
                    <div className="intake-input value-typed">Kovács Anna</div>
                  </div>
                  <div className="intake-field">
                    <span className="intake-label">E-mail</span>
                    <div className="intake-input value-typed">kovacs.anna@gmail.com</div>
                  </div>
                  <div className="intake-field">
                    <span className="intake-label">Helyiség</span>
                    <div className="intake-input value-typed">Nappali · 28 m²</div>
                  </div>
                  <div className="intake-field">
                    <span className="intake-label">Büdzsé</span>
                    <div className="intake-input value-typed">800 000 Ft</div>
                  </div>
                  <div className="intake-field full">
                    <span className="intake-label">Stílus-referenciák</span>
                    <div className="intake-photos">
                      <div className="intake-photo" />
                      <div className="intake-photo" />
                      <div className="intake-photo" />
                    </div>
                  </div>
                </div>
                <div className="intake-submit">
                  <button className="intake-btn">Beküldés →</button>
                </div>
              </div>
              <div className="demo-annotation" style={{ bottom: 24, left: 24, zIndex: 10, pointerEvents: 'none' }}>
                <strong>Step 1 — Az érdeklődő</strong>
                A saját aldomain-eden, a stúdiód arculatában. Az ügyfél kitölt, beküld.
              </div>
            </div>

            {/* Stage 2 */}
            <div className={isActive(1)} id="ds2">
              <div className="stage-process">
                <div className="process-spinner" />
                <div className="process-time">
                  <span>{processSec}</span>
                  <span className="of">/ 60 mp</span>
                </div>
                <ul className="process-status">
                  <li className="done"><span className="marker">✓</span><span>Fotók elemzése</span></li>
                  <li className="done"><span className="marker">✓</span><span>Portfólió-egyezés</span></li>
                  <li className="active"><span className="marker">◌</span><span>Brief megfogalmazása</span></li>
                  <li><span className="marker">·</span><span>Válaszlevél írása</span></li>
                </ul>
              </div>
              <div className="demo-annotation" style={{ bottom: 24, left: 24, zIndex: 10, pointerEvents: 'none' }}>
                <strong>Step 2 — A rendszer dolgozik</strong>
                Hatvan másodperc alatt minősítve. Csendben, gondosan, a háttérben.
              </div>
            </div>

            {/* Stage 3 */}
            <div className={isActive(2)} id="ds3">
              <div className="stage-dash">
                <div className="dash-topbar">
                  <div className="dash-brand">
                    <span>Uracs Studio<span className="dot">.</span></span>
                    <span className="label">Irányítópult</span>
                  </div>
                  <div className="dash-stats">
                    <span><span className="num">1</span>új</span>
                    <span><span className="num">3</span>folyamatban</span>
                    <span><span className="num">12</span>lezárt</span>
                  </div>
                </div>
                <div className="dash-toast">
                  <span className="pulse-dot" />
                  <span>
                    <strong>Új érdeklődés érkezett</strong>
                    <span className="muted"> — Kovács Anna · Nappali</span>
                  </span>
                </div>
                <div className="dash-content">
                  <div className="dash-section-label">Érdeklődések</div>
                  <div className="dash-card is-new">
                    <div>
                      <div className="dash-card-name">Kovács Anna</div>
                      <div className="dash-card-meta">Nappali · 28 m² · Budapest VII.</div>
                    </div>
                    <div className="dash-card-right">
                      <span className="dash-pill high">Magas</span>
                      <span className="dash-score">88 / 100</span>
                    </div>
                  </div>
                  <div className="dash-card faded">
                    <div>
                      <div className="dash-card-name">Nagy Bence</div>
                      <div className="dash-card-meta">Konyha · 14 m² · Budapest II.</div>
                    </div>
                    <div className="dash-card-right">
                      <span className="dash-pill med">Közepes</span>
                      <span className="dash-score">64 / 100</span>
                    </div>
                  </div>
                  <div className="dash-card faded">
                    <div>
                      <div className="dash-card-name">Szabó Péter</div>
                      <div className="dash-card-meta">Háló · 22 m² · Szentendre</div>
                    </div>
                    <div className="dash-card-right">
                      <span className="dash-pill med">Közepes</span>
                      <span className="dash-score">71 / 100</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="demo-annotation" style={{ bottom: 24, left: 24, zIndex: 10, pointerEvents: 'none' }}>
                <strong>Step 3 — A tied</strong>
                A te dashboardod, a te csapatod. Az új lead minőségpontszámmal érkezik.
              </div>
            </div>

            {/* Stage 4 */}
            <div className={isActive(3)} id="ds4">
              <div className="stage-brief">
                <div className="brief-stage-head">
                  <div>
                    <div className="brief-name">Kovács Anna</div>
                    <div className="brief-meta">Nappali · 28 m² · Budapest VII. · 2 perce</div>
                  </div>
                  <div>
                    <div className="brief-pill">Magas · 88 / 100</div>
                    <div className="brief-score">Stílus-egyezés 92%</div>
                  </div>
                </div>
                <div className="brief-stage-body">
                  <div>
                    <div className="brief-col-section">
                      <div className="brief-col-label">Brief</div>
                      <p className="brief-col-text">
                        Skandináv-minimalista nappali. Természetes anyagok, semleges paletta.{' '}
                        <span className="em">Büdzsé-illeszkedés: kiváló</span> — a{' '}
                        <span className="hi">800 000 Ft</span> reális keret.
                      </p>
                    </div>
                    <div className="brief-col-section">
                      <div className="brief-col-label">Stílus-egyezés</div>
                      <p className="brief-col-text">
                        Az ügyfél referenciái <span className="em">92%-ban átfednek</span> a
                        stúdió korábbi munkáival.
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="brief-col-section">
                      <div className="brief-col-label">Javasolt díjazás</div>
                      <p className="brief-col-text">
                        <span className="hi">240 000 — 320 000 Ft</span> tervezési díj.
                        Hasonló projektek 30%-os marzzsal zárnak.
                      </p>
                    </div>
                    <div className="brief-col-section">
                      <div className="brief-col-label">Válaszlevél vázlat</div>
                      <p className="brief-col-text" style={{ color: 'rgba(237,229,208,0.62)' }}>
                        <span className="em">
                          &ldquo;Kedves Anna, köszönöm a részletes leírást...&rdquo;
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="brief-stage-foot">
                  <button className="brief-btn primary">Válaszlevél másolása →</button>
                  <button className="brief-btn">Új jegyzet</button>
                  <button className="brief-btn">Archiválás</button>
                </div>
                <div className="brief-stage-toast">
                  <span className="check">✓</span>
                  <span>Vágólapra másolva — készen áll a küldésre.</span>
                </div>
              </div>
              <div className="demo-annotation" style={{ top: 24, right: 24, zIndex: 10, pointerEvents: 'none' }}>
                <strong>Step 4 — A döntés</strong>
                Megnyitod, átfutod, kimásolod. Egy kattintás — válasz a te hangnemedben.
              </div>
            </div>

          </div>
        </div>

        {/* Step indicators */}
        <div className="demo-steps">
          {(['Űrlap','Feldolgozás','Irányítópult','Válaszlevél'] as const).map((label, i) => (
            <div key={i} className={[
              'demo-step-item',
              stage === i ? 'is-active' : '',
              stage > i   ? 'is-done'   : '',
            ].filter(Boolean).join(' ')}>
              <div className="demo-step-dot">{i + 1}</div>
              <div className="demo-step-label">{label}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
