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
        sheets: {
          green: "#0f9d58",
          "green-hover": "#0b8043",
          "green-light": "#e6f4ea",
          "green-border": "#137333",
          gray: {
            50: "#f8f9fa",
            100: "#f1f3f4",
            200: "#e8eaed",
            300: "#dadce0",
            400: "#bdc1c6",
            500: "#9aa0a6",
            600: "#80868b",
            700: "#5f6368",
            800: "#3c4043",
            900: "#202124",
          },
          border: "#e0e0e0",
          selection: "#e8f0fe",
          selectionBorder: "#1a73e8",
        },
      },
      fontFamily: {
        sans: ["Roboto", "Arial", "sans-serif"],
        mono: ["Consolas", "Roboto Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
