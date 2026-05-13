'use client'

interface Props {
  height?: number
}

export default function SpacioLogo({ height = 32 }: Props) {
  return (
    <img
      src="/spacio-logo.png"
      height={height}
      style={{ height, width: 'auto', maxWidth: 120, display: 'block' }}
      alt="Spacio"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
    />
  )
}
