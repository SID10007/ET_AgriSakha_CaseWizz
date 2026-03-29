/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      spacing: {
        '2px': '2px', // Now you can use classes like pt-2px, m-2px, etc.
        '6px': '6px', // Now you can use classes like pt-6px, m-6px, etc.
      },
      gridTemplateColumns: {
        'auto-fit-180': 'repeat(auto-fit, minmax(180px, 1fr))',
      }
    },
  },
  plugins: [],
};
