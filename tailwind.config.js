/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAF9F5",
        foreground: "#231F1A",
        border: "#EAE4D9",
        input: "#EAE4D9",
        ring: "#B8860B",
        primary: {
          DEFAULT: "#B8860B",
          foreground: "#FFFFFF",
          hover: "#9E7307",
          light: "#F7F2E4",
        },
        secondary: {
          DEFAULT: "#C5A059",
          foreground: "#FFFFFF",
          hover: "#B38D45",
          light: "#FAF6EC",
        },
        muted: {
          DEFAULT: "#F4F0E8",
          foreground: "#70685C",
        },
        accent: {
          DEFAULT: "#F4F0E8",
          foreground: "#231F1A",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#231F1A",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#231F1A",
        },
        status: {
          baik: {
            bg: "#EBF5ED",
            text: "#2B6336",
            border: "#C2E2CA",
          },
          rusakRingan: {
            bg: "#FEF7E6",
            text: "#A36B00",
            border: "#FBE3B5",
          },
          rusakBerat: {
            bg: "#FDF2F2",
            text: "#C53030",
            border: "#F8C4C4",
          },
          perbaikan: {
            bg: "#F2F5FD",
            text: "#2B52BA",
            border: "#C7D7FB",
          },
        },
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [],
};
