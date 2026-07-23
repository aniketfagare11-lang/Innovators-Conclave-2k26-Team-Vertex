/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:      '#040c18',
          surface: '#071525',
          card:    '#0a1e35',
          border:  '#0f3060',
          cyan:    '#00d4ff',
          green:   '#00ff88',
          amber:   '#ffa500',
          red:     '#ff3333',
          text:    '#c8e0f4',
          muted:   '#4a7090',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        display: ['"Orbitron"', 'sans-serif'],
        body: ['"Exo 2"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #00d4ff40' },
          '100%': { boxShadow: '0 0 20px #00d4ff80, 0 0 40px #00d4ff40' }
        }
      },
      boxShadow: {
        'cyan': '0 0 20px rgba(0, 212, 255, 0.3)',
        'green': '0 0 20px rgba(0, 255, 136, 0.3)',
        'red': '0 0 20px rgba(255, 51, 51, 0.3)',
        'amber': '0 0 20px rgba(255, 165, 0, 0.3)',
      }
    }
  },
  plugins: []
};
