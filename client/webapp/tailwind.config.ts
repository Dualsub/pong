import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
    colors: {
      background: "#000",
      primary: {
        50: "#f0f5ff",   // Very light blue
        100: "#d6e4ff",  // Light pastel blue
        200: "#adc8ff",  // Soft blue
        300: "#85a9ff",  // Medium blue
        400: "#568eff",  // Bright blue
        500: "#2563eb",  // Classic blue
        600: "#1e4ead",  // Dark blue
        700: "#173a7c",  // Deeper blue
        800: "#102c5b",  // Very dark blue
        900: "#0a1d3b",  // Almost navy blue
      },
      white: "#fff",
    },
  },
  plugins: [],
}
export default config
