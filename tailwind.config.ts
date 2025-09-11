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
        // Match existing color scheme
        'operational': '#10B981',
        'maintenance': '#F59E0B',
        'out-of-service': '#EF4444',
        'primary': '#2563EB',
        'secondary': '#6B7280',
      },
      minHeight: {
        'touch': '48px', // Mobile touch target
      },
      minWidth: {
        'touch': '48px',
      },
      fontSize: {
        'mobile': '16px', // Prevent zoom on iOS
      },
      screens: {
        'xs': '375px', // Small phones
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
}

export default config