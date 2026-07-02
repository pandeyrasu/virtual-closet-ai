import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f1b16",
        cream: "#faf7f2",
        clay: "#b4654a",
        sage: "#7d8b6f",
      },
    },
  },
  plugins: [],
};

export default config;
