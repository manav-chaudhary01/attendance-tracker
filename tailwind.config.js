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
      },
    },
  },
  plugins: [],
}
