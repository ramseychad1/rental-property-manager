// components/home/TealBand.jsx
import { getIcon } from "@/lib/homeIcons";

export default function TealBand({ content }) {
  if (!content?.items?.length) return null;
  return (
    <section style={{ backgroundColor: content.backgroundColor, color: content.textColor }}>
      <div className="mx-auto max-w-7xl px-5 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {content.items.map(({ title, subtitle, icon }, i) => {
          const Icon = getIcon(icon);
          return (
            <div key={i} className="flex items-center gap-3">
              <Icon className="h-9 w-9 shrink-0" />
              <div>
                <div className="font-semibold">{title}</div>
                <div className="text-sm opacity-85">{subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
