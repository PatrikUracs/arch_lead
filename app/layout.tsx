import type { Metadata } from 'next'
import { Playfair_Display, Montserrat, Fraunces, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import './demo-preview.css'
import CursorGlow from './components/motion/CursorGlow'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['200', '300', '400'],
  variable: '--font-montserrat',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal'],
  variable: '--font-playfair',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz', 'wght'],
  weight: ['200', '300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Spacio',
    template: '%s | Spacio',
  },
  description: 'A stúdió-operációs rendszer, amely minden érdeklődést minősített ajánlattá vált. Tervezőstúdióknak.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'Spacio — Minden érdeklődőből minősített ügyfél',
    description: 'A stúdió-operációs rendszer, amely minden érdeklődést minősített ajánlattá vált. Tervezőstúdióknak.',
    locale: 'hu_HU',
    type: 'website',
    url: 'https://www.spacio-ai.net',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spacio — Minden érdeklődőből minősített ügyfél',
    description: 'A stúdió-operációs rendszer, amely minden érdeklődést minősített ajánlattá vált. Tervezőstúdióknak.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var s=localStorage.getItem('dl-theme');var m=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.setAttribute('data-theme',s||m);})();` }} />
      </head>
      <body className={`${montserrat.variable} ${playfair.variable} ${fraunces.variable} ${jetbrainsMono.variable} font-sans`}>
        <div className="ambient" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <div className="cursor-glow" id="cursor-glow" aria-hidden="true" />
        <CursorGlow />
        <div className="relative z-[3]">
          {children}
        </div>
      </body>
    </html>
  )
}
