"use client"

import { useState, useRef, useEffect, useCallback } from 'react'

/* â”€â”€â”€ constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const STAGES     = ['ds1', 'ds2', 'ds3', 'ds4']
const DURATIONS  = [3800, 3400, 3800, 4200]
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
const STEP_LABELS = ['Å°rlap', 'FeldolgozÃ¡s', 'IrÃ¡nyÃ­tÃ³pult', 'VÃ¡laszlevÃ©l']

/* â”€â”€â”€ sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function Stage1({ active }: { active: boolean }) {
  return (
    <div className={`demo-stage${active ? ' active' : ''}`} id="ds1">
      <div className="stage-intake">
        <div className="intake-brand">
          <div>
            <div className="intake-brand-name">Uracs Studio.</div>
            <div className="intake-brand-sub">BelsÅ‘Ã©pÃ­tÃ©szet Â· Budapest</div>
          </div>
          <div className="intake-steps">
            <span className="intake-step active">1 Â· RÃ³lad</span>
            <span className="intake-step">2 Â· A tÃ©rrÅ‘l</span>
            <span className="intake-step">3 Â· KÃ©pek</span>
          </div>
        </div>

        <div className="intake-title">MesÃ©lj a projektedrÅ‘l.</div>

        <div className="intake-form">
          <div className="intake-field">
            <label className="intake-label">NÃ©v</label>
            <div className="intake-input value-typed">KovÃ¡cs Anna</div>
          </div>
          <div className="intake-field">
            <label className="intake-label">E-mail</label>
            <div className="intake-input value-typed">kovacs.anna@gmail.com</div>
          </div>
          <div className="intake-field">
            <label className="intake-label">HelyisÃ©g</label>
            <div className="intake-input value-typed">Nappali Â· 28 mÂ²</div>
          </div>
          <div className="intake-field">
            <label className="intake-label">BÃ¼dzsÃ©</label>
            <div className="intake-input value-typed">800 000 Ft</div>
          </div>
          <div className="intake-field intake-field-full">
            <label className="intake-label">StÃ­lus-referenciÃ¡k</label>
            <div className="intake-photos">
              <div className="intake-photo" />
              <div className="intake-photo" />
              <div className="intake-photo" />
            </div>
          </div>
        </div>

        <div className="intake-submit-row">
          <button className="intake-btn is-active">BekÃ¼ldÃ©s â†’</button>
        </div>

        <div className="demo-annotation" style={{ bottom: 24, left: 24 }}>
          <strong>Step 1 â€” Az Ã©rdeklÅ‘dÅ‘</strong>
          A sajÃ¡t aldomain-eden, a stÃºdiÃ³d arculatÃ¡ban. Az Ã¼gyfÃ©l kitÃ¶lt, bekÃ¼ld.
        </div>
      </div>
    </div>
  )
}

function Stage2({ active, processSec }: { active: boolean; processSec: number }) {
  return (
    <div className={`demo-stage${active ? ' active' : ''}`} id="ds2">
      <div className="stage-process">
        <div className="process-spinner" />
        <div className="process-counter">
          <span className="process-count">{processSec}</span>
          <span className="process-total">/ 60 mp</span>
        </div>
        <div className="process-status">
          <div className="ps-item done">
            <span className="ps-marker">âœ“</span>
            <span>FotÃ³k elemzÃ©se</span>
          </div>
          <div className="ps-item done">
            <span className="ps-marker">âœ“</span>
            <span>PortfÃ³liÃ³-egyezÃ©s</span>
          </div>
          <div className="ps-item active">
            <span className="ps-marker pulse-marker">â—Œ</span>
            <span>Brief megfogalmazÃ¡sa</span>
          </div>
          <div className="ps-item pending">
            <span className="ps-marker faint">Â·</span>
            <span className="faint">VÃ¡laszlevÃ©l Ã­rÃ¡sa</span>
          </div>
        </div>

        <div className="demo-annotation" style={{ bottom: 24, left: 24 }}>
          <strong>Step 2 â€” A rendszer dolgozik</strong>
          Hatvan mÃ¡sodperc alatt minÅ‘sÃ­tve. Csendben, gondosan, a hÃ¡ttÃ©rben.
        </div>
      </div>
    </div>
  )
}

function Stage3({ active }: { active: boolean }) {
  return (
    <div className={`demo-stage${active ? ' active' : ''}`} id="ds3">
      <div className="stage-dash">
        <div className="dash-topbar">
          <div className="dash-topbar-left">
            <span className="dash-studio">Uracs Studio.</span>
            <span className="dash-topbar-sep">|</span>
            <span className="dash-topbar-label">IrÃ¡nyÃ­tÃ³pult</span>
          </div>
          <div className="dash-topbar-stats">
            <span className="dash-stat"><span className="stat-num">1</span><span className="stat-label"> Ãºj</span></span>
            <span className="dash-stat"><span className="stat-num">3</span><span className="stat-label"> folyamatban</span></span>
            <span className="dash-stat"><span className="stat-num">12</span><span className="stat-label"> lezÃ¡rt</span></span>
          </div>
        </div>

        <div className={`dash-toast${active ? ' active' : ''}`}>
          <span className="toast-dot" />
          Ãšj Ã©rdeklÅ‘dÃ©s Ã©rkezett â€” KovÃ¡cs Anna Â· Nappali
        </div>

        <div className="dash-content">
          <div className="dash-section-label">Ã‰rdeklÅ‘dÃ©sek</div>

          <div className={`dash-card is-new${active ? ' active' : ''}`}>
            <div className="dash-card-left">
              <div className="dash-card-name">KovÃ¡cs Anna</div>
              <div className="dash-card-meta">Nappali Â· 28 mÂ² Â· Budapest VII.</div>
            </div>
            <div className="dash-card-right">
              <span className="dash-pill high">Magas</span>
              <span className="dash-score">88 / 100</span>
            </div>
          </div>

          <div className="dash-card faded">
            <div className="dash-card-left">
              <div className="dash-card-name">Nagy Bence</div>
              <div className="dash-card-meta">Konyha Â· 14 mÂ² Â· Budapest II.</div>
            </div>
            <div className="dash-card-right">
              <span className="dash-pill medium">KÃ¶zepes</span>
              <span className="dash-score">64 / 100</span>
            </div>
          </div>

          <div className="dash-card faded">
            <div className="dash-card-left">
              <div className="dash-card-name">SzabÃ³ PÃ©ter</div>
              <div className="dash-card-meta">HÃ¡lÃ³ Â· 22 mÂ² Â· Szentendre</div>
            </div>
            <div className="dash-card-right">
              <span className="dash-pill medium">KÃ¶zepes</span>
              <span className="dash-score">71 / 100</span>
            </div>
          </div>
        </div>

        <div className="demo-annotation" style={{ bottom: 24, left: 24 }}>
          <strong>Step 3 â€” A tied</strong>
          A te dashboardod, a te csapatod. Az Ãºj lead minÅ‘sÃ©gpontszÃ¡mmal Ã©rkezik.
        </div>
      </div>
    </div>
  )
}

function Stage4({ active }: { active: boolean }) {
  return (
    <div className={`demo-stage${active ? ' active' : ''}`} id="ds4">
      <div className="stage-brief">
        <div className="brief-header">
          <div className="brief-header-left">
            <div className="brief-name">KovÃ¡cs Anna</div>
            <div className="brief-meta">Nappali Â· 28 mÂ² Â· Budapest VII. Â· 2 perce</div>
          </div>
          <div className="brief-header-right">
            <div className="brief-score-pill">Magas Â· 88 / 100</div>
            <div className="brief-match">StÃ­lus-egyezÃ©s 92%</div>
          </div>
        </div>

        <div className="brief-body">
          <div className="brief-col">
            <div className="brief-block">
              <div className="brief-block-title">Brief</div>
              <p className="brief-text">
                SkandinÃ¡v-minimalista nappali. TermÃ©szetes anyagok, semleges paletta.{' '}
                <em className="brief-em">BÃ¼dzsÃ©-illeszkedÃ©s: kivÃ¡lÃ³</em> â€” a{' '}
                <span className="brief-accent">800 000 Ft</span> reÃ¡lis keret.
              </p>
            </div>
            <div className="brief-block">
              <div className="brief-block-title">StÃ­lus-egyezÃ©s</div>
              <p className="brief-text">
                Az Ã¼gyfÃ©l referenciÃ¡i <em className="brief-em">92%-ban Ã¡tfednek</em> a stÃºdiÃ³ korÃ¡bbi munkÃ¡ival.
                ErÅ‘s meggyÅ‘zÅ‘dÃ©ssel ajÃ¡nlhatÃ³.
              </p>
            </div>
          </div>
          <div className="brief-col">
            <div className="brief-block">
              <div className="brief-block-title">Javasolt dÃ­jazÃ¡s</div>
              <p className="brief-text">
                <span className="brief-fee">240 000 â€” 320 000 Ft</span> tervezÃ©si dÃ­j.
                HasonlÃ³ projektek 30%-os marzzsal zÃ¡rnak.
              </p>
            </div>
            <div className="brief-block">
              <div className="brief-block-title">VÃ¡laszlevÃ©l vÃ¡zlat</div>
              <p className="brief-text brief-draft">
                Kedves Anna, kÃ¶szÃ¶nÃ¶m a rÃ©szletes leÃ­rÃ¡st. A tÃ©r adottsÃ¡gai Ã©s a referenciÃ¡id alapjÃ¡nâ€¦
              </p>
            </div>
          </div>
        </div>

        <div className="brief-footer">
          <button className="brief-btn primary is-active">VÃ¡laszlevÃ©l mÃ¡solÃ¡sa â†’</button>
          <button className="brief-btn">Ãšj jegyzet</button>
          <button className="brief-btn">ArchivÃ¡lÃ¡s</button>
        </div>

        <div className={`brief-toast${active ? ' active' : ''}`}>
          âœ“&nbsp; VÃ¡gÃ³lapra mÃ¡solva â€” kÃ©szen Ã¡ll a kÃ¼ldÃ©sre.
        </div>

        <div className="demo-annotation" style={{ top: 24, right: 24 }}>
          <strong>Step 4 â€” A dÃ¶ntÃ©s</strong>
          Megnyitod, Ã¡tfutod, kimÃ¡solod. Egy kattintÃ¡s â€” vÃ¡lasz a te hangnemedben.
        </div>
      </div>
    </div>
  )
}

/* â”€â”€â”€ main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export default function DemoPreview() {
  const [currentStage, setCurrentStage] = useState(0)
  const [processSec, setProcessSec]     = useState(0)
  const [recTime, setRecTime]           = useState('0:00')

  const started        = useRef(false)
  const stageTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const processTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recSecondsRef  = useRef(0)
  const currentStageRef = useRef(0)

  const advance = useCallback(() => {
    setCurrentStage(c => {
      const next = (c + 1) % 4
      currentStageRef.current = next
      stageTimerRef.current = setTimeout(advance, DURATIONS[next])
      return next
    })
  }, [])

  const startDemo = useCallback(() => {
    if (started.current) return
    started.current = true

    currentStageRef.current = 0
    setCurrentStage(0)

    stageTimerRef.current = setTimeout(advance, DURATIONS[0])

    recSecondsRef.current = 0
    recTimerRef.current = setInterval(() => {
      recSecondsRef.current += 1
      const m = Math.floor(recSecondsRef.current / 60)
      const s = recSecondsRef.current % 60
      setRecTime(`${m}:${s.toString().padStart(2, '0')}`)
    }, 1000)
  }, [advance])

  /* intersection observer trigger */
  useEffect(() => {
    const section = document.getElementById('demo')
    if (!section || !('IntersectionObserver' in window)) {
      startDemo()
      return
    }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTimeout(startDemo, 500); obs.unobserve(section) }
    }, { threshold: 0.3 })
    obs.observe(section)
    return () => obs.disconnect()
  }, [startDemo])

  /* processSec counter â€” only active in stage 2 */
  useEffect(() => {
    if (currentStage === 1) {
      setProcessSec(0)
      processTimerRef.current = setInterval(() => {
        setProcessSec(s => Math.min(s + 4, 60))
      }, 200)
    } else {
      if (processTimerRef.current) clearInterval(processTimerRef.current)
    }
  }, [currentStage])

  /* cleanup on unmount */
  useEffect(() => {
    return () => {
      if (stageTimerRef.current)   clearTimeout(stageTimerRef.current)
      if (recTimerRef.current)     clearInterval(recTimerRef.current)
      if (processTimerRef.current) clearInterval(processTimerRef.current)
    }
  }, [])

  return (
    <section id="demo" className="py-20 flex flex-col items-center px-4">
      <div className="demo-window" style={{ width: '100%', maxWidth: 920 }}>

        {/* browser chrome */}
        <div className="demo-chrome">
          <div className="chrome-dots">
            <span className="chrome-dot red" />
            <span className="chrome-dot yellow" />
            <span className="chrome-dot green" />
          </div>
          <div className="chrome-url">{URLS[currentStage]}</div>
          <div className="chrome-rec">
            <span className="rec-dot" />
            <span>{recTime}</span>
          </div>
        </div>

        {/* screen */}
        <div className="demo-screen">
          {/* cursor */}
          <div
            className="demo-cursor"
            style={{ left: CURSOR_POS[currentStage].left, top: CURSOR_POS[currentStage].top }}
          >
            <svg viewBox="0 0 20 24" width="18" height="22">
              <path
                d="M4 2 L16.5 11.5 L10 13 L8 20 L4 2Z"
                fill="#EDE5D0"
                stroke="#0F0D0A"
                strokeWidth="0.8"
              />
            </svg>
          </div>

          <Stage1 active={currentStage === 0} />
          <Stage2 active={currentStage === 1} processSec={processSec} />
          <Stage3 active={currentStage === 2} />
          <Stage4 active={currentStage === 3} />
        </div>
      </div>

      {/* step indicators */}
      <div className="demo-steps">
        {STEP_LABELS.map((label, i) => (
          <div
            key={STAGES[i]}
            className={`demo-step${i === currentStage ? ' is-active' : i < currentStage ? ' is-done' : ''}`}
          >
            <div className="step-dot">{i + 1}</div>
            <div className="step-label">{label}</div>
          </div>
        ))}
      </div>

    </section>
  )
}

// styles live in app/demo-preview.css (imported in layout.tsx)
