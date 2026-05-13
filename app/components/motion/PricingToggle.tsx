'use client'

import { useState, useRef, useCallback } from 'react'

interface PricingToggleProps {
  monthlyPrice: number
  onChange?: (yearly: boolean) => void
}

export default function PricingToggle({ monthlyPrice, onChange }: PricingToggleProps) {
  const [yearly, setYearly] = useState(false)
  const priceRef = useRef<HTMLSpanElement>(null)

  const yearlyPrice = Math.round(monthlyPrice * 12 * 0.85 / 12)

  const toggle = useCallback((next: boolean) => {
    if (next === yearly) return
    const el = priceRef.current
    if (!el) {
      setYearly(next)
      onChange?.(next)
      return
    }

    el.style.transition = 'opacity 200ms ease'
    el.style.opacity = '0'

    setTimeout(() => {
      setYearly(next)
      onChange?.(next)
      el.style.opacity = '1'
    }, 200)
  }, [yearly, onChange])

  const displayPrice = yearly ? yearlyPrice : monthlyPrice

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div
        role="group"
        aria-label="Számlázási időszak"
        style={{
          position: 'relative',
          display: 'flex',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--rule)',
          borderRadius: 2,
          padding: 2,
        }}
      >
        {/* sliding indicator */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            width: 'calc(50% - 2px)',
            bottom: 2,
            background: 'var(--accent-subtle)',
            border: '1px solid var(--accent-dim)',
            borderRadius: 2,
            transform: yearly ? 'translateX(100%)' : 'translateX(0)',
            transition: '480ms var(--ease)',
          }}
        />

        {(['Havi', 'Éves'] as const).map((label, i) => {
          const isActive = yearly === (i === 1)
          return (
            <button
              key={label}
              onClick={() => toggle(i === 1)}
              style={{
                position: 'relative',
                zIndex: 1,
                padding: '8px 24px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: 'var(--font-montserrat), system-ui, sans-serif',
                fontWeight: 300,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: isActive ? 'var(--accent-soft)' : 'var(--text-mute)',
                transition: 'color 200ms ease',
              }}
              aria-pressed={isActive}
            >
              {label}
            </button>
          )
        })}
      </div>

      {yearly && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 300,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--accent-soft)',
          }}
        >
          15% kedvezmény
        </span>
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span
          ref={priceRef}
          style={{
            fontFamily: 'var(--font-playfair), serif',
            fontSize: 32,
            fontWeight: 400,
            color: 'var(--dl-text-primary, #EDE5D0)',
          }}
        >
          {displayPrice.toLocaleString('hu-HU')}
        </span>
        <span style={{ fontSize: 13, fontWeight: 300, color: 'var(--text-mute)' }}>
          Ft / hó
        </span>
      </div>
    </div>
  )
}
