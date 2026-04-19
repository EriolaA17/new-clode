/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
    './src/renderer/index.html'
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#383838',
        panel: '#252526',
        surface: '#2d2d2d',
        border: '#3e3e3e',
        accent: '#0079FF',
      }
    }
  },
  plugins: []
}
