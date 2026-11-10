/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // MIRROR Design Tokens
        mirror: {
          bg: '#0f172a',         // slate-900 — primary background
          surface: '#1e293b',    // slate-800 — card/panel
          border: '#334155',     // slate-700 — borders
          text: '#e2e8f0',       // slate-200 — primary text
          muted: '#94a3b8',      // slate-400 — muted text
          accent: '#3b82f6',     // blue-500 — interactive
          'accent-hover': '#2563eb', // blue-600
          warning: '#f59e0b',    // amber-500 — conflicts, warnings
          danger: '#ef4444',     // red-500 — critical damage
          success: '#22c55e',    // green-500 — synced, approved
          // Intelligence plane indicator
          'intel-local': '#8b5cf6',  // violet-500 — local AI
          'intel-cloud': '#06b6d4',  // cyan-500 — cloud AI
          'intel-human': '#22c55e',  // green-500 — human
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
