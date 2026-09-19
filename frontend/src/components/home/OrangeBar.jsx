// components/home/OrangeBar.jsx
import { getIcon } from "@/lib/homeIcons";

export default function OrangeBar({ content }) {
  if (!content?.items?.length) return null;
  return (
    <section style={{ backgroundColor: content.backgroundColor, color: content.textColor }}>
      <div className="mx-auto max-w-7xl px-5 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {content.items.map(({ title, subtitle, icon }, i) => {
          const Icon = getIcon(icon);
          return (
            <div key={i} className="flex items-center gap-3">
              <Icon className="h-8 w-8 shrink-0" />
              <div className="leading-tight">
                <div className="font-semibold text-base">{title}</div>
                <div className="text-xs opacity-90">{subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
