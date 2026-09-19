import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Loader2, Plus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
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
const SECTIONS = [
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
                  <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
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
        {section.fields.map((f) => (
          <Field key={f.name} field={f} value={draft[f.name]}
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

export default function SiteContentPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["site-content"],
    queryFn: siteContentApi.get,
  });

  return (
    <div className="p-5 md:p-8">
      <PageHeader
        title="Site Content"
        subtitle="Edit the text, images and colors on the public homepage. Changes appear as soon as you save a section."
      />
      {isLoading ? (
        <Skeleton className="h-[420px] w-full rounded-xl" />
      ) : error || !data ? (
        <p className="text-sm text-destructive">Could not load site content.</p>
      ) : (
        <Tabs defaultValue={SECTIONS[0].key} className="space-y-4">
          <TabsList className="h-auto flex-wrap justify-start">
            {SECTIONS.map((s) => <TabsTrigger key={s.key} value={s.key}>{s.label}</TabsTrigger>)}
          </TabsList>
          {SECTIONS.map((s) => (
            <TabsContent key={s.key} value={s.key}>
              <SectionEditor section={s} saved={data[s.key]} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
