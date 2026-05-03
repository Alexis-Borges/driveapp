/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0C0D0F',
        card: '#191C20',
        card2: '#1E2126',
        border: '#2A2D33',
        text: '#EEEEF0',
        muted: '#878D9A',
        muted2: '#454B57',
        instructor: '#7C75FF',
        instructor2: '#A09BFF',
        student: '#00C896',
        student2: '#33DBA8',
        danger: '#FF4F4F',
        warning: '#FFB230',
        success: '#52C41A',
      },
      fontFamily: {
        sans: ['DMSans_400Regular'],
        medium: ['DMSans_500Medium'],
        bold: ['DMSans_700Bold'],
        mono: ['DMMono_400Regular'],
      },
    },
  },
  plugins: [],
};
