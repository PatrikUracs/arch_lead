'use client'
import { useEffect, useRef } from 'react'

export default function HeroWaves() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let t = 0

    const waves = [
      { yBase: 0.55, freq: 1.8, freq2: 0.9, amp: 0.09, amp2: 0.04, speed: 0.4, offset: 0,   color: 'rgba(201,169,110,0.18)' },
      { yBase: 0.65, freq: 2.2, freq2: 1.1, amp: 0.07, amp2: 0.03, speed: 0.3, offset: 2.1, color: 'rgba(201,169,110,0.12)' },
      { yBase: 0.78, freq: 1.5, freq2: 0.7, amp: 0.05, amp2: 0.02, speed: 0.5, offset: 4.3, color: 'rgba(201,169,110,0.08)' },
    ]

    function resize() {
      canvas!.width = canvas!.offsetWidth
      canvas!.height = canvas!.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function render() {
      const W = canvas!.width
      const H = canvas!.height
      ctx!.clearRect(0, 0, W, H)

      waves.forEach(wave => {
        const phase = t * wave.speed + wave.offset
        ctx!.beginPath()
        for (let x = 0; x <= W; x += 2) {
          const y = wave.yBase * H
            + Math.sin((x / W) * wave.freq * Math.PI * 2 + phase) * wave.amp * H
            + Math.sin((x / W) * wave.freq2 * Math.PI * 2 + phase * 0.7) * wave.amp2 * H
          if (x === 0) { ctx!.moveTo(x, y) } else { ctx!.lineTo(x, y) }
        }
        ctx!.lineTo(W, H)
        ctx!.lineTo(0, H)
        ctx!.closePath()
        const grad = ctx!.createLinearGradient(0, wave.yBase * H - wave.amp * H * 2, 0, H)
        grad.addColorStop(0, wave.color)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx!.fillStyle = grad
        ctx!.fill()
      })

      t += 0.008
      animId = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
}
