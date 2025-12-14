/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#212E5B',
          50: '#e6e8ef',
          100: '#cfd3e1',
          200: '#aeb3c9',
          300: '#8d93b1',
          400: '#6c7399',
          500: '#4b5481',
          600: '#38416a',
          700: '#212E5B',
          800: '#1a2446',
          900: '#131a31',
        },
      },
    },
  },
  plugins: [],
};
