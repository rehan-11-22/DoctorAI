/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./constants/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        primary: {
          DEFAULT: "#007AFF", // Main blue
          light: "#64B5FF", // Lighter variant
          dark: "#005AC1", // Darker variant
        },
        // Status Colors
        secondary: {
          DEFAULT: "#34C759", // Success green
          light: "#7DDF9A",
          dark: "#1A8C3D",
        },
        accent: {
          DEFAULT: "#FF9500", // Warning orange
          light: "#FFB44A",
          dark: "#CC7700",
        },
        danger: {
          DEFAULT: "#FF3B30", // Error red
          light: "#FF6961",
          dark: "#D70015",
        },
        // Grayscale
        dark: {
          DEFAULT: "#1C1C1E",
          light: "#2C2C2E",
          lighter: "#3A3A3C",
        },
        light: {
          DEFAULT: "#F8FAFC",
          dark: "#E5E7EB",
          darker: "#D1D5DB",
        },
        // Text Colors
        text: {
          DEFAULT: "#333333",
          light: "#FFFFFF",
          muted: "#6B7280",
          dark: "#111827",
        },
        // Medical Specific
        medical: {
          teal: "#30D5C8", // For health metrics
          purple: "#AF52DE", // For premium features
          pink: "#FF2D55", // For alerts
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"], // Default font
        mono: ["Roboto Mono", "monospace"], // For code/technical display
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        DEFAULT: "0 2px 4px 0 rgba(0, 0, 0, 0.1)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"), // For better form element styling
    require("@tailwindcss/typography"), // For rich text content
  ],
};
