import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        pitch:   '#0e3b1f',  // deep field green
        accent:  '#d4af37',  // trophy gold
        chalk:   '#f7f4ec',
      },
    },
  },
}
export default config
