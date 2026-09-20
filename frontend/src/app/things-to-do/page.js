import ThingsToDoExplorer from "@/components/things-to-do/ThingsToDoExplorer";
import { api } from "@/services/api";
import { getSiteContent, getBrand, pageTitle } from "@/lib/getSiteContent";

const DEFAULTS = {
  heading: "Things to do nearby",
  intro: "",
  backgroundColor: "#0b7c83",
  textColor: "#ffffff",
  emptyMessage: "Nothing has been added yet. Check back soon.",
  metaDescription: "",
};

export async function generateMetadata() {
  const [content, brand] = await Promise.all([getSiteContent(), getBrand()]);
  const page = { ...DEFAULTS, ...(content?.thingsPage ?? {}) };
  return { title: pageTitle("Things To Do", brand), description: page.metaDescription || undefined };
}

// { category: { area: [items] } } in the order the API returns them
// (category, then area, then name). Items without an area sit under "".
function group(items) {
  const out = {};
  for (const item of items) {
    const category = item.category || "Local favorites";
    const area = item.area || "";
    ((out[category] ||= {})[area] ||= []).push(item);
  }
  return out;
}

async function getThingsToDo() {
  try {
    const response = await api.listThingsToDo();
    return response.data || [];
  } catch (error) {
    console.error("Failed to load things to do", error);
    return [];
  }
}

export default async function ThingsToDoPage() {
  const [items, content] = await Promise.all([getThingsToDo(), getSiteContent()]);
  const page = { ...DEFAULTS, ...(content?.thingsPage ?? {}) };

  return (
    <div>
      <section style={{ backgroundColor: page.backgroundColor, color: page.textColor }}>
        <div className="mx-auto max-w-7xl px-5 py-12 text-center">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">{page.heading}</h1>
          {page.intro && <p className="mx-auto mt-3 max-w-2xl opacity-90">{page.intro}</p>}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-12">
        {items.length === 0 ? (
          <p className="py-16 text-center text-lg text-[var(--color-muted-foreground)]" data-testid="things-empty">
            {page.emptyMessage}
          </p>
        ) : (
          <ThingsToDoExplorer data={group(items)} />
        )}
      </div>
    </div>
  );
}
