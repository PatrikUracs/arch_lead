import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          gold:  '#C9A96E',
          dark:  '#0A0A0A',
          card:  '#111111',
          input: '#1A1A1A',
          cream: '#F5F0E8',
        },
      },
      fontFamily: {
        sans:    ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)',   'Georgia',   'serif'],
      },
    },
  },
  plugins: [],
}
export default config
