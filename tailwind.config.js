/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#faf9f6', // Warm off-white
          subtle: '#f4f3ef',   // Subtle neutral background for cards/panels
          muted: '#ebe9e3',    // Secondary neutral
        },
        charcoal: {
          DEFAULT: '#1c1917', // Dark charcoal primary text
          muted: '#57534e',   // Secondary text
          light: '#78716c',   // Subtle/caption text
        },
        accent: {
          DEFAULT: '#2e5b42', // Muted forest green
          hover: '#244834',
          light: '#eaf2ec',
          subtle: '#d5e4da',
        },
        border: {
          DEFAULT: '#e5e3dc', // Subtle border
          strong: '#d3d0c7',
        },
        status: {
          eligible: '#2e5b42',
          eligibleBg: '#edf5f0',
          warning: '#995d12',
          warningBg: '#fef7ec',
          ineligible: '#a83232',
          ineligibleBg: '#fdf2f2',
          neutral: '#78716c',
          neutralBg: '#f5f5f4',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      transitionTimingFunction: {
        'organimo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'smooth-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'smooth-in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
        '600': '600ms',
      },
      keyframes: {
        'reveal-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'reveal-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'subtle-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'reveal-up': 'reveal-up 380ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'reveal-down': 'reveal-down 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scale-in 240ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fade-in 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'subtle-pulse': 'subtle-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
