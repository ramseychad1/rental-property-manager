// components/home/TestimonialSlider.jsx
"use client";

import { useState } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

const initialsOf = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

export default function TestimonialSlider({ content }) {
  const testimonials = content?.items ?? [];
  const [active, setActive] = useState(0);
  const t = testimonials[active];
  if (!t) return null;

  return (
    <div className="relative w-full rounded-2xl border border-[var(--color-border)] p-6 shadow-sm"
      style={{ backgroundColor: content.cardBackgroundColor, color: content.textColor }}
      data-testid="testimonial-slider">
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4"
            style={i < t.rating
              ? { fill: content.accentColor, color: content.accentColor }
              : { color: "var(--color-border)" }} />
        ))}
      </div>
      <p className="text-sm leading-relaxed min-h-[140px]">
        {t.text}
      </p>
      <div className="mt-5 flex items-center gap-3">
        <span className="h-10 w-10 rounded-full bg-[var(--color-foreground)] text-white flex items-center justify-center text-sm font-semibold">
          {initialsOf(t.name)}
        </span>
        <div>
          <div className="font-semibold">{t.name}</div>
          <div className="text-xs opacity-75">{t.role}</div>
        </div>
      </div>
      <button aria-label="Previous"
        onClick={() => setActive((active - 1 + testimonials.length) % testimonials.length)}
        className="absolute -left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] hover:bg-[var(--color-secondary)]"
        data-testid="testimonial-prev">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button aria-label="Next"
        onClick={() => setActive((active + 1) % testimonials.length)}
        className="absolute -right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] hover:bg-[var(--color-secondary)]"
        data-testid="testimonial-next">
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}