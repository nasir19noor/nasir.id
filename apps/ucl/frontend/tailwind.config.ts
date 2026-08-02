import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        night:  '#0b164a',  // UCL midnight blue
        accent: '#e3c268',  // trophy gold
        chalk:  '#f6f8fd',
      },
    },
  },
}
export default config
