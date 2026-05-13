'use client'

import { useEffect, useRef, ReactNode, CSSProperties } from 'react'

interface BriefCardTiltProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export default function BriefCardTilt({ children, className = '', style }: BriefCardTiltProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (
      window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return

    let targetRX = 0
    let targetRY = 0
    let currentRX = 0
    let currentRY = 0
    let rafId: number
    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / (rect.width / 2)
      const dy = (e.clientY - cy) / (rect.height / 2)
      targetRY = dx * 4
      targetRX = -dy * 4
    }

    const onMouseLeave = () => {
      targetRX = 0
      targetRY = 0
    }

    const onMouseEnter = () => { /* keeps RAF alive on re-entry */ }

    const tick = () => {
      currentRX += (targetRX - currentRX) * 0.06
      currentRY += (targetRY - currentRY) * 0.06

      const rx = Math.abs(currentRX) < 0.01 ? 0 : currentRX
      const ry = Math.abs(currentRY) < 0.01 ? 0 : currentRY

      el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`
      rafId = requestAnimationFrame(tick)
    }

    el.addEventListener('mousemove', onMouseMove, { passive: true })
    el.addEventListener('mouseenter', onMouseEnter, { passive: true })
    el.addEventListener('mouseleave', onMouseLeave, { passive: true })
    rafId = requestAnimationFrame(tick)

    return () => {
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('mouseenter', onMouseEnter)
      el.removeEventListener('mouseleave', onMouseLeave)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{ willChange: 'transform', ...style }}
    >
      {children}
    </div>
  )
}
