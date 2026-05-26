/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Surface Layer ──────────────────────────────────────────────────────
        // Deep matte charcoal — the app background
        background: "#18181b",
        // Slightly lifted matte grey — cards, panels, dialogs
        surface: "#27272a",

        // ─── Primary Action ─────────────────────────────────────────────────────
        // Oxidized military green — raw, tactile, editorial
        primary: {
          DEFAULT: "#4a5c3a",   // muted military green
          hover:   "#5a7048",   // slightly lighter for hover states
          muted:   "#3a4a2c",   // darker pressed / active state
        },

        // ─── Text Hierarchy ─────────────────────────────────────────────────────
        "text-main":  "#f4f4f5",  // bone / off-white — primary readable text
        "text-muted": "#a1a1aa",  // medium warm grey — secondary / metadata text
        "text-faint": "#52525b",  // barely-there grey — placeholder / disabled

        // ─── Borders & Dividers ─────────────────────────────────────────────────
        border:       "#3f3f46",  // subtle charcoal border
        "border-dim": "#2d2d30",  // even more recessed divider

        // ─── Semantic ───────────────────────────────────────────────────────────
        destructive: "#7f1d1d",   // muted dark red — errors, delete actions
        warning:     "#78350f",   // dark amber — caution states
        success:     "#14532d",   // dark forest green — confirmed / resolved
      },

      fontFamily: {
        // Clean geometric sans — UI labels, headings, body copy
        sans: ["'Inter'", "'Helvetica Neue'", "Arial", "sans-serif"],
        // Typewriter mono — chord names, lyrics, code snippets
        mono: ["'JetBrains Mono'", "'Courier New'", "Courier", "monospace"],
      },

      fontSize: {
        // Editorial type scale
        "2xs": ["0.625rem", { lineHeight: "1rem" }],      // 10px
        xs:    ["0.75rem",  { lineHeight: "1.125rem" }],  // 12px
        sm:    ["0.875rem", { lineHeight: "1.375rem" }],  // 14px
        base:  ["1rem",     { lineHeight: "1.625rem" }],  // 16px
        lg:    ["1.125rem", { lineHeight: "1.75rem" }],   // 18px
        xl:    ["1.25rem",  { lineHeight: "1.875rem" }],  // 20px
        "2xl": ["1.5rem",   { lineHeight: "2rem" }],      // 24px
        "3xl": ["1.875rem", { lineHeight: "2.375rem" }],  // 30px
        "4xl": ["2.25rem",  { lineHeight: "2.75rem",  letterSpacing: "-0.02em" }], // 36px
        "5xl": ["3rem",     { lineHeight: "1.1",      letterSpacing: "-0.03em" }], // 48px
      },

      letterSpacing: {
        tighter: "-0.04em",
        tight:   "-0.02em",
        normal:  "0em",
        wide:    "0.06em",   // Good for small-caps / metadata labels
        wider:   "0.10em",
        widest:  "0.15em",
      },

      borderRadius: {
        none: "0",
        sm:   "2px",   // Tactile, sharp — inputs, tags
        DEFAULT: "4px",
        md:   "6px",
        lg:   "8px",
        xl:   "12px",
        full: "9999px",
      },

      boxShadow: {
        // Flat / editorial — avoid decorative glow shadows
        sm:   "0 1px 2px 0 rgba(0,0,0,0.5)",
        DEFAULT: "0 2px 6px 0 rgba(0,0,0,0.45)",
        md:   "0 4px 12px 0 rgba(0,0,0,0.5)",
        lg:   "0 8px 24px 0 rgba(0,0,0,0.55)",
        inset: "inset 0 1px 3px 0 rgba(0,0,0,0.4)",
      },

      transitionDuration: {
        fast:   "100ms",
        normal: "180ms",
        slow:   "320ms",
      },

      transitionTimingFunction: {
        // Prefer snappy, mechanical easing — no bouncy curves
        editorial: "cubic-bezier(0.25, 0.1, 0.25, 1.0)",
      },
    },
  },
  plugins: [],
}