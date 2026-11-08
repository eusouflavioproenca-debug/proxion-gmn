/** Design system Proxion — tokens em src/styles.css (:root). */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        base: "rgb(var(--base) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        raised: "rgb(var(--raised) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        dim: "rgb(var(--dim) / <alpha-value>)",
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          soft: "rgb(var(--brand-soft) / <alpha-value>)",
          ink: "rgb(var(--brand-ink) / <alpha-value>)",
        },
        ok: "rgb(var(--ok) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        bad: "rgb(var(--bad) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
      },
      fontFamily: {
        display: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Manrope", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
      },
      borderRadius: { xl: "14px", "2xl": "18px" },
      boxShadow: {
        card: "0 1px 0 rgb(255 255 255 / 0.04) inset, 0 10px 30px -12px rgb(0 0 0 / 0.6)",
        glow: "0 0 0 1px rgb(var(--brand) / 0.35), 0 8px 28px -8px rgb(var(--brand) / 0.45)",
      },
      keyframes: {
        rise: { from: { opacity: "0.001", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        pop: { from: { opacity: "0.001", transform: "scale(.97)" }, to: { opacity: "1", transform: "none" } },
        sheet: { from: { transform: "translateY(24px)", opacity: "0.001" }, to: { transform: "none", opacity: "1" } },
      },
      animation: {
        rise: "rise .35s cubic-bezier(.2,.7,.2,1) both",
        pop: "pop .18s cubic-bezier(.2,.7,.2,1) both",
        sheet: "sheet .26s cubic-bezier(.2,.7,.2,1) both",
      },
    },
  },
  plugins: [],
};
