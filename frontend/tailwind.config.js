/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        background: '#f7f8fb',
        surface: '#ffffff',
        primary: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        text: {
          primary: '#0f172a',
          muted: '#475569',
          subtle: '#94a3b8',
        },
        border: '#e5e7eb',
      },
      borderRadius: {
        'large': '16px',
        'medium': '12px',
        'small': '8px',
        'pill': '9999px',
      },
      boxShadow: {
        'card': '0 8px 24px rgba(2,6,23,.06)',
      },
    },
  },
  plugins: [],
}