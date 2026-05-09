import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    // Pick up SDK class names so Tailwind doesn't tree-shake any utility we use there.
    "../../packages/beli-aman-sdk/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Bridge brand CSS vars (set by SDK applyBrandTheme) into Tailwind utilities.
      colors: {
        brand: {
          DEFAULT: "var(--c-primary, #0F766E)",
          fg: "var(--c-primary-fg, #FFFFFF)",
          secondary: "var(--c-secondary, #134E4A)",
          accent: "var(--c-accent, #10B981)",
          surface: "var(--c-surface, #F8FAFC)",
          text: "var(--c-text, #0F172A)",
          muted: "var(--c-text-muted, #64748B)",
        },
      },
      borderRadius: {
        bsm: "var(--r-sm, 6px)",
        bmd: "var(--r-md, 12px)",
        blg: "var(--r-lg, 20px)",
      },
      fontFamily: {
        heading: ["var(--font-heading, system-ui, sans-serif)"],
        body: ["var(--font-body, system-ui, sans-serif)"],
      },
    },
  },
  plugins: [],
};

export default config;
