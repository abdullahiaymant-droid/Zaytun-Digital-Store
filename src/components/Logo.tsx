import { Link } from "@tanstack/react-router";

// To use an uploaded official logo, replace the contents of this component with an <img />.
export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Zaytun Digital Tech Store home">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-display text-lg font-bold text-gold">Z</span>
      <span className="leading-none">
        <span className={`block font-display text-lg font-bold tracking-[0.18em] ${inverted ? "text-ink-foreground" : "text-foreground"}`}>
          ZAYTUN
        </span>
        <span className={`block text-[9px] font-semibold tracking-[0.22em] ${inverted ? "text-gold" : "text-primary"}`}>
          DIGITAL TECH STORE
        </span>
      </span>
    </Link>
  );
}
