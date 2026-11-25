import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        forest: "#243b2f",
        clay: "#b9684e",
        sand: "#f4f0e7",
        gold: "#d8b67a",
      },
      fontFamily: {
        sans: ["Arial", "Helvetica Neue", "sans-serif"],
        display: ["Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
