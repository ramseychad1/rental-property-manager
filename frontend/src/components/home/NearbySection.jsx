import Image from "next/image";
import { ImageIcon } from "lucide-react";

export default function NearbySection({ content }) {
  if (!content?.items?.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      {content.items.map((n, i) => (
        <div key={i} className="flex flex-col">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--color-muted)]">
            {n.image ? (
              <Image src={n.image} alt={n.name} fill className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw" />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--color-border)]">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="mt-3 text-center">
            <div className="font-semibold md:text-lg" style={{ color: content.nameColor }}>{n.name}</div>
            <div className="text-sm font-semibold" style={{ color: content.noteColor }}>{n.note}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
