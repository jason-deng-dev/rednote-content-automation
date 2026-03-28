/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:               '#FAFAF8',
        surface:          '#FFFFFF',
        border:           '#E8E8E4',
        'text-primary':   '#1A1A1A',
        'text-secondary': '#6B6B6B',
        'text-disabled':  '#ABABAB',
        accent:           '#C8102E',
        'accent-hover':   '#A00D24',
        success:          '#2D6A4F',
        warning:          '#B5770D',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0',
        none: '0',
      },
      letterSpacing: {
        tight: '-0.02em',
        wide:  '0.08em',
      },
    },
  },
  plugins: [],
};
