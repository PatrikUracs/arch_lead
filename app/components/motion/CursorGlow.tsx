'use client'

import { useEffect } from 'react'

export default function CursorGlow() {
  useEffect(() => {
    const glow = document.getElementById('cursor-glow')
    const isTouch = matchMedia('(hover: none)').matches
    const prefersReduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!glow || isTouch || prefersReduce) return

    let mx = window.innerWidth / 2
    let my = window.innerHeight / 2
    let gx = mx
    let gy = my
    let active = false
    let rafId: number

    const onMove = (e: MouseEvent) => {
      mx = e.clientX
      my = e.clientY
      if (!active) { glow.classList.add('is-on'); active = true }
    }
    const onLeave = () => { glow.classList.remove('is-on'); active = false }

    const tick = () => {
      gx += (mx - gx) * 0.12
      gy += (my - gy) * 0.12
      glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`
      rafId = requestAnimationFrame(tick)
    }

    document.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    tick()

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return null
}
