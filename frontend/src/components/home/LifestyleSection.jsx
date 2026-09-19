// components/home/LifestyleSection.jsx
import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const lines = (s) => String(s ?? "").split("\n");

export default function LifestyleSection({ content: c }) {
  const images = c.images?.length ? c.images : [];
  return (
    <section style={{ backgroundColor: c.backgroundColor }}>
      <div className="mx-auto max-w-7xl px-5 py-20 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl font-semi-bold leading-tight"
            style={{ color: c.headingColor }}>
            {c.heading}
          </h2>
          <p className="font-script text-6xl sm:text-7xl mt-3 leading-none" style={{ color: c.headingColor }}>
            {c.script}
          </p>
          <div className="mt-8 space-y-5 text-base leading-relaxed max-w-xl" style={{ color: c.textColor }}>
            {c.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
            {c.emphasis && (
              <p className="font-semibold">
                {lines(c.emphasis).map((line, i, arr) => (
                  <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                ))}
              </p>
            )}
          </div>
          {c.buttonLabel && (
            <Button asChild size="lg" className="mt-8">
              <Link href="/properties">{c.buttonLabel}</Link>
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {(images.length ? images : [null, null, null, null]).map((src, i) => (
            <div key={i}
              className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--color-muted)] ${i % 2 ? "translate-y-6" : ""}`}>
              {src ? (
                <Image src={src} alt="Lifestyle" fill className="object-cover"
                  sizes="(max-width: 768px) 50vw, 33vw" />
              ) : (
                <div className="flex h-full items-center justify-center text-[var(--color-border)]">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
