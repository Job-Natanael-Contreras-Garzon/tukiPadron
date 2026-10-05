/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          cyan: "#31A6CA",
          cyanLight: "#35A9C6",
          orange: "#EC7D17",
          dark: "#040304",
          card: "#FFFFFF",
          muted: "#64748B",
          bg: "#F1F8FA"
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      boxShadow: {
        'brand': '0 10px 25px -5px rgba(49, 166, 202, 0.2), 0 8px 10px -6px rgba(49, 166, 202, 0.2)',
        'orange': '0 10px 25px -5px rgba(236, 125, 23, 0.3), 0 8px 10px -6px rgba(236, 125, 23, 0.3)',
      }
    },
  },
  plugins: [],
}
