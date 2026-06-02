/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#2563EB", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#6366F1", foreground: "#FFFFFF" },
        accent: { DEFAULT: "#059669", foreground: "#FFFFFF" },
        background: "#FFFFFF",
        foreground: "#0F172A",
        muted: { DEFAULT: "#F1F5FD", foreground: "#64748B" },
        border: "#E4ECFC",
        destructive: { DEFAULT: "#DC2626", foreground: "#FFFFFF" },
        ring: "#2563EB",
      },
      fontFamily: {
        display: ['Rubik', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Nunito Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        600: "600",
        700: "700",
        800: "800",
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        soft: "0 4px 16px -2px rgba(37, 99, 235, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.05)",
        lift: "0 18px 40px -12px rgba(37, 99, 235, 0.28), 0 8px 16px -8px rgba(15, 23, 42, 0.12)",
      },
      keyframes: {
        "blob-1": {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(28px,-22px) scale(1.12)" },
        },
        "blob-2": {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(-26px,18px) scale(1.08)" },
        },
      },
      animation: {
        "blob-1": "blob-1 11s ease-in-out infinite",
        "blob-2": "blob-2 13s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
