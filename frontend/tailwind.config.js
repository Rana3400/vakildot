/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "#FDFBF7",
        foreground: "#1C1917",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1C1917",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#1C1917",
        },
        primary: {
          DEFAULT: "#1C1917",
          foreground: "#FDFBF7",
        },
        secondary: {
          DEFAULT: "#E7E5E4",
          foreground: "#1C1917",
        },
        muted: {
          DEFAULT: "#F5F5F4",
          foreground: "#78716C",
        },
        accent: {
          DEFAULT: "#F5F5F4",
          foreground: "#1C1917",
        },
        destructive: {
          DEFAULT: "#B91C1C",
          foreground: "#FDFBF7",
        },
        border: "#E7E5E4",
        input: "#E7E5E4",
        ring: "#1C1917",
        chart: {
          1: "#1C1917",
          2: "#B91C1C",
          3: "#D97706",
          4: "#4B5563",
          5: "#9CA3AF",
        },
        tarikh: {
          urgent: "#B91C1C",
          upcoming: "#D97706",
          distant: "#1C1917",
        },
        success: "#15803D",
        sidebar: {
          bg: "#1C1917",
          fg: "#FDFBF7",
          active: "#333333",
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};