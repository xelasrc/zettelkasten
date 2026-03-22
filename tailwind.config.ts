import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        base: '#141414',
        surface: '#1c1c1c',
        elevated: '#242424',
        line: '#2c2c2c',
        muted: '#3a3a3a',
        dim: '#666666',
        soft: '#999999',
        primary: '#f0f0f0',
        accent: '#ffffff',
      },
    },
  },
  plugins: [],
}

export default config