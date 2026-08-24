/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/views/**/*.ejs",
    "./public/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          cyan: "#22d3ee",
          emerald: "#34d399"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: [],
  corePlugins: {
    preflight: true
  }
};
