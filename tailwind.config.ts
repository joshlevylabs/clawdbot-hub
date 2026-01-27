import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: "#0a0a0f",
          800: "#12121a",
          700: "#1a1a25",
          600: "#252532",
          500: "#32324a",
        },
        accent: {
          purple: "#8b5cf6",
          blue: "#3b82f6",
          cyan: "#06b6d4",
          green: "#10b981",
          yellow: "#f59e0b",
          red: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
export default config;
