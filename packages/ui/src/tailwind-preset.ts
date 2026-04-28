import type { Config } from 'tailwindcss';

/**
 * BT TOUR ERP 디자인 시스템 프리셋.
 * BTTOUR_SAAS 도면(index.html / dashboard.html)에서 추출한 토큰을 기반으로 함.
 *
 * 사용처: apps/web/tailwind.config.ts 등에서 `presets: [bttourPreset]`로 import.
 */
export const bttourPreset: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          700: '#334e68',
          800: '#243b53',
          900: '#1e3a5f',
          950: '#0f1e30',
        },
        orange: {
          500: '#ff6b35',
          600: '#ea580c',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(15, 23, 42, 0.06)',
        float: '0 10px 30px rgba(15, 23, 42, 0.08)',
        glow: '0 0 0 1px rgba(255, 107, 53, 0.4), 0 8px 24px rgba(255, 107, 53, 0.18)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out both',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'grad-navy': 'linear-gradient(135deg, #1e3a5f 0%, #0f1e30 100%)',
        'grad-text-orange': 'linear-gradient(90deg, #ff6b35 0%, #fbbf24 100%)',
        'dot-grid':
          'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '24px 24px',
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
    },
  },
  plugins: [],
};

export default bttourPreset;
