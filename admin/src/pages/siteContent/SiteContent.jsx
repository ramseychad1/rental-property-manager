import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { FileText, Globe, Home, ImageIcon, Loader2, Mail, Plus, RotateCcw, Save, Trash2, Upload, Building2, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { siteContentApi } from "@/lib/api";
import { cn } from "@/lib/utils";

// Keep in sync with frontend/src/lib/homeIcons.js
const ICON_OPTIONS = [
  "Anchor", "Bed", "Users", "Waves", "Wifi", "Sunset", "TreePalm", "Wind", "MapPin", "Star",
  "Heart", "Sun", "Umbrella", "Ship", "Fish", "KeyRound", "Headphones", "ShieldCheck", "Hand",
  "Car", "Utensils", "Dumbbell", "Trees", "Flame", "Coffee", "Bike",
];

const iconItemFields = [
  { name: "title", label: "Title", type: "text" },
  { name: "subtitle", label: "Subtitle", type: "text" },
  { name: "icon", label: "Icon", type: "icon" },
];

// Field config drives the whole form. Section keys match the backend
// (backend/src/lib/siteContent.js).
const HOME_SECTIONS = [
  {
    key: "hero",
    label: "Hero",
    description: "Top banner: headline, background image and the highlight icons.",
    fields: [
      { name: "eyebrow", label: "Eyebrow text", type: "text" },
      { name: "headline", label: "Headline (new line = line break)", type: "textarea", rows: 2 },
      { name: "script", label: "Script tagline", type: "text" },
      { name: "body", label: "Body text", type: "textarea", rows: 2 },
      { name: "bgImage", label: "Background image", type: "image" },
      { name: "overlayOpacity", label: "Dark overlay strength (0–90%)", type: "range" },
      { name: "textColor", label: "Text color", type: "color" },
      { name: "eyebrowColor", label: "Eyebrow color", type: "color" },
      { name: "scriptColor", label: "Script tagline color", type: "color" },
      {
        name: "highlights", label: "Highlights", type: "list", max: 6, addLabel: "Add highlight",
        newItem: { label: "", icon: "Star" },
        itemFields: [
          { name: "label", label: "Label", type: "text" },
          { name: "icon", label: "Icon", type: "icon" },
        ],
      },
    ],
  },
  {
    key: "featureBar",
    label: "Feature bar",
    description: "Colored strip under the hero (up to 4 items).",
    fields: [
      { name: "backgroundColor", label: "Background color", type: "color" },
      { name: "textColor", label: "Text color", type: "color" },
      { name: "items", label: "Items", type: "list", max: 4, addLabel: "Add item",
        newItem: { title: "", subtitle: "", icon: "Star" }, itemFields: iconItemFields },
    ],
  },
  {
    key: "lifestyle",
    label: "Lifestyle",
    description: "Story section with copy on the left and up to 4 photos on the right.",
    fields: [
      { name: "heading", label: "Heading", type: "text" },
      { name: "script", label: "Script text", type: "text" },
      { name: "paragraphs", label: "Paragraphs", type: "stringList", max: 4, addLabel: "Add paragraph" },
      { name: "emphasis", label: "Closing line (new line = line break)", type: "textarea", rows: 2 },
      { name: "buttonLabel", label: "Button label (blank hides button)", type: "text" },
      { name: "images", label: "Photos", type: "imageList", max: 4 },
      { name: "backgroundColor", label: "Background color", type: "color" },
      { name: "headingColor", label: "Heading color", type: "color" },
      { name: "textColor", label: "Body text color", type: "color" },
    ],
  },
  {
    key: "nearby",
    label: "Nearby",
    description: "Three photo cards for local attractions. Background also applies behind the testimonials.",
    fields: [
      { name: "backgroundColor", label: "Section background color", type: "color" },
      { name: "nameColor", label: "Name color", type: "color" },
      { name: "noteColor", label: "Note color", type: "color" },
      { name: "items", label: "Places", type: "list", max: 3, addLabel: "Add place",
        newItem: { name: "", note: "", image: "" },
        itemFields: [
          { name: "name", label: "Name", type: "text" },
          { name: "note", label: "Note", type: "text" },
          { name: "image", label: "Photo", type: "image" },
        ] },
    ],
  },
  {
    key: "testimonials",
    label: "Testimonials",
    description: "Guest review slider.",
    fields: [
      { name: "cardBackgroundColor", label: "Card background color", type: "color" },
      { name: "textColor", label: "Text color", type: "color" },
      { name: "accentColor", label: "Star color", type: "color" },
      { name: "items", label: "Reviews", type: "list", max: 10, addLabel: "Add review",
        newItem: { name: "", role: "", rating: 5, text: "" },
        itemFields: [
          { name: "name", label: "Name", type: "text" },
          { name: "role", label: "Role / location", type: "text" },
          { name: "rating", label: "Rating (1–5)", type: "rating" },
          { name: "text", label: "Review", type: "textarea", rows: 3 },
        ] },
    ],
  },
  {
    key: "trustBand",
    label: "Trust band",
    description: "Colored strip at the bottom of the page (up to 4 items).",
    fields: [
      { name: "backgroundColor", label: "Background color", type: "color" },
      { name: "textColor", label: "Text color", type: "color" },
      { name: "items", label: "Items", type: "list", max: 4, addLabel: "Add item",
        newItem: { title: "", subtitle: "", icon: "Star" }, itemFields: iconItemFields },
    ],
  },
];

// Shared field groups
const bannerFields = [
  { name: "backgroundColor", label: "Banner background color", type: "color" },
  { name: "textColor", label: "Banner text color", type: "color" },
];
const searchField = {
  name: "metaDescription",
  label: "Search engine description (shown under the page title in Google results)",
  type: "textarea",
  rows: 2,
};
const policyFields = [
  { name: "title", label: "Page title", type: "text" },
  { name: "lastUpdated", label: 'Last updated (shown as "Last updated: ...")', type: "text" },
  { type: "note", label: "Blank line = new paragraph. Web addresses (https://...) become clickable links. Have this text reviewed by counsel before relying on it." },
  {
    name: "sections", label: "Sections", type: "list", max: 30, addLabel: "Add section",
    newItem: { title: "", body: "" },
    itemFields: [
      { name: "title", label: "Section heading", type: "text" },
      { name: "body", label: "Text", type: "textarea", rows: 8 },
    ],
  },
  { type: "heading", label: "Search engines" },
  searchField,
];

// Content that appears across the whole site.
const SITE_SECTIONS = [
  {
    key: "brand",
    label: "Contact & branding",
    description: "Your name, tagline and contact details. They appear in the header bar, the footer and the Contact page. Anything left blank is hidden.",
    fields: [
      { type: "heading", label: "Site identity" },
      { name: "siteName", label: "Site name (browser tab, page titles, footer)", type: "text" },
      { name: "tagline", label: "Tagline (footer)", type: "text" },
      { type: "heading", label: "Contact details" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "address", label: "Address (footer)", type: "text" },
      { type: "heading", label: "Social links (full web addresses; blank hides the icon)" },
      { name: "facebook", label: "Facebook", type: "text" },
      { name: "instagram", label: "Instagram", type: "text" },
      { name: "tiktok", label: "TikTok", type: "text" },
      { name: "x", label: "X (Twitter)", type: "text" },
    ],
  },
  {
    key: "seo",
    label: "Search & sharing",
    description: "How the site appears in Google results and when someone shares a link.",
    fields: [
      { name: "title", label: "Site title", type: "text" },
      { name: "description", label: "Site description", type: "textarea", rows: 2 },
      { name: "keywords", label: "Keywords (comma separated, optional)", type: "text" },
      { name: "shareImage", label: "Sharing image (defaults to the homepage hero image)", type: "image" },
    ],
  },
];

const PROPERTIES_SECTIONS = [
  {
    key: "propertiesPage",
    label: "Properties page",
    description: "The banner at the top of the Properties page. The properties themselves are managed under Properties.",
    fields: [
      { type: "heading", label: "Banner" },
      { name: "headline", label: "Headline", type: "text" },
      ...bannerFields,
      {
        name: "features", label: "Highlights beside the headline", type: "list", max: 4, addLabel: "Add highlight",
        newItem: { title: "", subtitle: "", icon: "Star" },
        itemFields: [
          { name: "title", label: "Title", type: "text" },
          { name: "subtitle", label: "Subtitle", type: "text" },
          { name: "icon", label: "Icon", type: "icon" },
        ],
      },
      { type: "heading", label: "Messages" },
      { name: "emptyMessage", label: "Shown when there are no properties", type: "text" },
      { type: "heading", label: "Search engines" },
      searchField,
    ],
  },
];

const SERVICES_SECTIONS = [
  {
    key: "servicesPage",
    label: "Services page",
    description: "Optional extras guests can add to a stay, such as a chef or a tour.",
    fields: [
      { type: "heading", label: "Banner" },
      { name: "heading", label: "Page heading", type: "text" },
      { name: "intro", label: "Intro text (optional)", type: "textarea", rows: 2 },
      ...bannerFields,
      { type: "heading", label: "Services" },
      {
        name: "services", label: "Services", type: "list", max: 30, addLabel: "Add service",
        newItem: { title: "", image: "", price: 0, priceNote: "", shortDescription: "", description: "" },
        itemFields: [
          { name: "title", label: "Name", type: "text" },
          { name: "price", label: "Price ($)", type: "number" },
          { name: "priceNote", label: "Price note (e.g. per stay)", type: "text" },
          { name: "image", label: "Photo", type: "image" },
          { name: "shortDescription", label: "Short description (shown first)", type: "textarea", rows: 2 },
          { name: "description", label: "Full description (shown after View more)", type: "textarea", rows: 4 },
        ],
      },
      { type: "heading", label: "Search engines" },
      searchField,
    ],
  },
];

const CONTACT_SECTIONS = [
  {
    key: "contactPage",
    label: "Contact page",
    description: "The Contact page. Phone and email come from Site-wide > Contact & branding.",
    fields: [
      { type: "heading", label: "Banner" },
      { name: "heading", label: "Page heading", type: "text" },
      { name: "intro", label: "Intro text", type: "textarea", rows: 2 },
      ...bannerFields,
      { type: "heading", label: "Location" },
      { name: "locationLabel", label: "Location text (blank hides it)", type: "text" },
      { name: "mapQuery", label: "Map location: an address or place name (blank hides the map)", type: "text" },
      { type: "heading", label: "Contact form" },
      { name: "successMessage", label: "Message shown after someone sends the form", type: "text" },
      { type: "heading", label: "Search engines" },
      searchField,
    ],
  },
];

// Left menu, in the same order as the public site's navigation. A page with
// several sections gets tabs; a single-section page is one form.
const PAGES = [
  { key: "site", label: "Site-wide", icon: Globe, hint: "Header, footer, browser tab", sections: SITE_SECTIONS },
  { key: "home", label: "Home", icon: Home, hint: "The landing page", sections: HOME_SECTIONS },
  { key: "properties", label: "Properties", icon: Building2, hint: "Listing page banner", sections: PROPERTIES_SECTIONS },
  { key: "services", label: "Services", icon: Sparkles, hint: "Optional extras", sections: SERVICES_SECTIONS },
  { key: "contact", label: "Contact", icon: Mail, hint: "Details and form", sections: CONTACT_SECTIONS },
  {
    key: "privacy", label: "Privacy Policy", icon: ShieldCheck, hint: "Legal text",
    sections: [{ key: "privacyPage", label: "Privacy Policy", description: "Your privacy policy page.", fields: policyFields }],
  },
  {
    key: "refund", label: "Refund Policy", icon: FileText, hint: "Legal text",
    sections: [{ key: "refundPage", label: "Refund Policy", description: "Your refund and cancellation policy page.", fields: policyFields }],
  },
];

/* ------------------------------ field widgets ----------------------------- */

function ColorField({ label, value, onChange }) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1"
          aria-label={`${label} picker`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`font-mono w-32 ${valid ? "" : "border-destructive"}`}
          maxLength={7}
          aria-label={`${label} hex`}
        />
      </div>
    </div>
  );
}

function ImageField({ label, value, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 8 * 1024 * 1024) return toast.error("Image must be under 8MB");
    setBusy(true);
    try {
      onChange(await siteContentApi.uploadImage(file));
    } catch (err) {
      toast.error(err.normalizedMessage || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-3">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" />
            : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {value ? "Replace" : "Upload"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>Remove</Button>
        )}
      </div>
    </div>
  );
}

function IconField({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value || "Star"} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {ICON_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function ListShell({ label, count, max, addLabel, onAdd, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button type="button" size="sm" variant="outline" disabled={count >= max} onClick={onAdd}>
          <Plus className="h-4 w-4" /> {addLabel || "Add"}
        </Button>
      </div>
      {children}
    </div>
  );
}

const move = (arr, i, v) => arr.map((x, idx) => (idx === i ? v : x));
const drop = (arr, i) => arr.filter((_, idx) => idx !== i);

function Field({ field, value, onChange }) {
  const { type, label } = field;
  switch (type) {
    case "heading":
      return <h4 className="font-display text-base font-semibold pt-3 border-t first:border-t-0 first:pt-0">{label}</h4>;
    case "note":
      return <p className="text-xs text-muted-foreground -mt-2">{label}</p>;
    case "number":
      return (
        <div className="space-y-1.5">
          <Label>{label}</Label>
          <Input type="number" min={0} value={value ?? 0} className="w-40"
            onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
        </div>
      );
    case "text":
      return (
        <div className="space-y-1.5">
          <Label>{label}</Label>
          <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "textarea":
      return (
        <div className="space-y-1.5">
          <Label>{label}</Label>
          <Textarea rows={field.rows || 3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "color":
      return <ColorField label={label} value={value ?? ""} onChange={onChange} />;
    case "image":
      return <ImageField label={label} value={value} onChange={onChange} />;
    case "icon":
      return <IconField label={label} value={value} onChange={onChange} />;
    case "range":
      return (
        <div className="space-y-1.5">
          <Label>{label}: {value}%</Label>
          <input type="range" min={0} max={90} value={value ?? 0}
            onChange={(e) => onChange(Number(e.target.value))} className="w-full max-w-xs" />
        </div>
      );
    case "rating":
      return (
        <div className="space-y-1.5">
          <Label>{label}</Label>
          <Input type="number" min={1} max={5} value={value ?? 5} className="w-24"
            onChange={(e) => onChange(Math.min(5, Math.max(1, Number(e.target.value) || 1)))} />
        </div>
      );
    case "stringList": {
      const list = value ?? [];
      return (
        <ListShell label={label} count={list.length} max={field.max} addLabel={field.addLabel}
          onAdd={() => onChange([...list, ""])}>
          {list.map((v, i) => (
            <div key={i} className="flex gap-2">
              <Textarea rows={3} value={v} onChange={(e) => onChange(move(list, i, e.target.value))} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remove"
                onClick={() => onChange(drop(list, i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </ListShell>
      );
    }
    case "imageList": {
      const list = value ?? [];
      return (
        <ListShell label={label} count={list.length} max={field.max} addLabel="Add photo"
          onAdd={() => onChange([...list, ""])}>
          <div className="grid gap-3 sm:grid-cols-2">
            {list.map((v, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border p-3">
                <div className="flex-1"><ImageField value={v} onChange={(u) => onChange(move(list, i, u))} /></div>
                <Button type="button" variant="ghost" size="icon" aria-label="Remove photo"
                  onClick={() => onChange(drop(list, i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </ListShell>
      );
    }
    case "list": {
      const list = value ?? [];
      return (
        <ListShell label={label} count={list.length} max={field.max} addLabel={field.addLabel}
          onAdd={() => onChange([...list, { ...field.newItem }])}>
          {list.map((item, i) => (
            <div key={i} className="rounded-lg border p-3 flex gap-2 items-start">
              <div className="flex-1 grid gap-3 sm:grid-cols-2">
                {field.itemFields.map((f) => (
                  <div key={f.name} className={f.type === "textarea" || f.type === "image" ? "sm:col-span-2" : ""}>
                    <Field field={f} value={item[f.name]}
                      onChange={(v) => onChange(move(list, i, { ...item, [f.name]: v }))} />
                  </div>
                ))}
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Remove item"
                onClick={() => onChange(drop(list, i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </ListShell>
      );
    }
    default:
      return null;
  }
}

/* ------------------------------ section editor ---------------------------- */

function SectionEditor({ section, saved }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(saved);
  const [busy, setBusy] = useState(null); // "save" | "reset"

  useEffect(() => setDraft(saved), [saved]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["site-content"] });

  const save = async () => {
    setBusy("save");
    try {
      await siteContentApi.save(section.key, draft);
      toast.success(`${section.label} saved`);
      refresh();
    } catch (err) {
      toast.error(err.normalizedMessage || "Could not save");
    } finally {
      setBusy(null);
    }
  };

  const reset = async () => {
    if (!window.confirm(`Reset the ${section.label} section to its default placeholder content?`)) return;
    setBusy("reset");
    try {
      await siteContentApi.reset(section.key);
      toast.success(`${section.label} reset to defaults`);
      refresh();
    } catch (err) {
      toast.error(err.normalizedMessage || "Could not reset");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-5 sm:p-6 space-y-6">
      <p className="text-sm text-muted-foreground">{section.description}</p>
      <div className="grid gap-5">
        {section.fields.map((f, i) => (
          <Field key={f.name ?? `${f.type}-${i}`} field={f} value={draft[f.name]}
            onChange={(v) => setDraft((d) => ({ ...d, [f.name]: v }))} />
        ))}
      </div>
      <div className="flex gap-2 pt-2 border-t">
        <Button onClick={save} disabled={!!busy} className="mt-4">
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save {section.label}
        </Button>
        <Button variant="outline" onClick={reset} disabled={!!busy} className="mt-4">
          <RotateCcw className="h-4 w-4" /> Reset to defaults
        </Button>
      </div>
    </Card>
  );
}

const NO_DATA = {};

function PageEditor({ page, data }) {
  const [tab, setTab] = useState(page.sections[0].key);
  // Reset to the first tab when switching pages.
  useEffect(() => setTab(page.sections[0].key), [page]);

  if (page.sections.length === 1) {
    const section = page.sections[0];
    return <SectionEditor section={section} saved={data[section.key] ?? NO_DATA} />;
  }
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList className="h-auto flex-wrap justify-start">
        {page.sections.map((s) => <TabsTrigger key={s.key} value={s.key}>{s.label}</TabsTrigger>)}
      </TabsList>
      {page.sections.map((s) => (
        <TabsContent key={s.key} value={s.key}>
          <SectionEditor section={s} saved={data[s.key] ?? NO_DATA} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

export default function SiteContentPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["site-content"],
    queryFn: siteContentApi.get,
  });
  // The selected page lives in the URL (?page=contact) so a refresh keeps your place.
  const [params, setParams] = useSearchParams();
  const page = PAGES.find((p) => p.key === params.get("page")) ?? PAGES[0];

  return (
    <div className="p-5 md:p-8">
      <PageHeader
        title="Site Content"
        subtitle="Edit the text, images and colors on the public website. Each page below matches a page on the site. Changes appear as soon as you save a section, so save before switching to another one."
      />
      {isLoading ? (
        <Skeleton className="h-[420px] w-full rounded-xl" />
      ) : error || !data ? (
        <p className="text-sm text-destructive">Could not load site content.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-[220px_1fr] items-start">
          <nav aria-label="Site pages" className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:sticky md:top-20 pb-1">
            {PAGES.map((p) => {
              const active = p.key === page.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setParams({ page: p.key })}
                  data-testid={`site-page-${p.key}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors shrink-0",
                    active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                >
                  <p.icon className="w-4 h-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-tight">{p.label}</span>
                    <span className="hidden md:block text-xs text-muted-foreground truncate">{p.hint}</span>
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="min-w-0">
            <PageEditor page={page} data={data} />
          </div>
        </div>
      )}
    </div>
  );
}
