import { z } from "zod";

// Homepage content model. Each section has a zod schema (validates admin
// input) and a generic-placeholder default (used until the admin saves that
// section). Colors are 6-digit hex strings; images are absolute URLs from
// POST /api/site-content/upload, or "" for none.

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #0b7c83");
const text = (max = 300) => z.string().trim().max(max);
const image = z.string().trim().max(1000);
const icon = z.string().trim().max(40);

const iconItem = z.object({ title: text(60), subtitle: text(120), icon });

const barSchema = z.object({
  backgroundColor: color,
  textColor: color,
  items: z.array(iconItem).max(4),
});

export const SECTION_SCHEMAS = {
  hero: z.object({
    eyebrow: text(80),
    headline: text(200), // newline = line break
    script: text(80),
    body: text(400),
    bgImage: image,
    overlayOpacity: z.coerce.number().min(0).max(90),
    textColor: color,
    eyebrowColor: color,
    scriptColor: color,
    highlights: z.array(z.object({ label: text(40), icon })).max(6),
  }),
  featureBar: barSchema,
  lifestyle: z.object({
    heading: text(120),
    script: text(80),
    paragraphs: z.array(text(600)).max(4),
    emphasis: text(300), // newline = line break
    buttonLabel: text(40),
    images: z.array(image).max(4),
    backgroundColor: color,
    headingColor: color,
    textColor: color,
  }),
  nearby: z.object({
    backgroundColor: color,
    nameColor: color,
    noteColor: color,
    items: z.array(z.object({ name: text(60), note: text(80), image })).max(3),
  }),
  testimonials: z.object({
    cardBackgroundColor: color,
    textColor: color,
    accentColor: color,
    items: z
      .array(
        z.object({
          name: text(60),
          role: text(80),
          rating: z.coerce.number().int().min(1).max(5),
          text: text(600),
        }),
      )
      .max(10),
  }),
  trustBand: barSchema,
};

export const SECTION_DEFAULTS = {
  hero: {
    eyebrow: "Welcome",
    headline: "YOUR HEADLINE GOES HERE.\nMAKE IT MEMORABLE",
    script: "A short, friendly tagline",
    body: "Describe your community and what makes a stay here special.",
    bgImage: "",
    overlayOpacity: 40,
    textColor: "#ffffff",
    eyebrowColor: "#fc8a00",
    scriptColor: "#8fdce0",
    highlights: [
      { label: "Highlight One", icon: "Star" },
      { label: "Highlight Two", icon: "Waves" },
      { label: "Wifi", icon: "Wifi" },
      { label: "Sleeps 8", icon: "Users" },
      { label: "Prime Location", icon: "MapPin" },
    ],
  },
  featureBar: {
    backgroundColor: "#fc8a00",
    textColor: "#ffffff",
    items: [
      { title: "FEATURE ONE", subtitle: "SHORT DESCRIPTION", icon: "Sun" },
      { title: "FEATURE TWO", subtitle: "SHORT DESCRIPTION", icon: "Umbrella" },
      { title: "FEATURE THREE", subtitle: "SHORT DESCRIPTION", icon: "Star" },
      { title: "FEATURE FOUR", subtitle: "SHORT DESCRIPTION", icon: "Heart" },
    ],
  },
  lifestyle: {
    heading: "Not just a stay.",
    script: "A LIFESTYLE",
    paragraphs: [
      "Use this space to describe the experience guests can expect when they stay with you.",
      "Mention amenities, services or community features that set your properties apart.",
    ],
    emphasis: "A closing line that sums it up.",
    buttonLabel: "View properties",
    images: [],
    backgroundColor: "#ffffff",
    headingColor: "#0b7c83",
    textColor: "#013449",
  },
  nearby: {
    backgroundColor: "#ffffff",
    nameColor: "#0b7c83",
    noteColor: "#033545",
    items: [
      { name: "Nearby Place One", note: "5 minutes away", image: "" },
      { name: "Nearby Place Two", note: "Right next door", image: "" },
      { name: "Nearby Place Three", note: "10 minutes away", image: "" },
    ],
  },
  testimonials: {
    cardBackgroundColor: "#ffffff",
    textColor: "#013449",
    accentColor: "#0b7c83",
    items: [
      { name: "Guest Name", role: "Guest", rating: 5, text: "Replace this with a real guest review." },
      { name: "Another Guest", role: "Guest", rating: 5, text: "Add a second review to show more variety." },
    ],
  },
  trustBand: {
    backgroundColor: "#0b7c83",
    textColor: "#ffffff",
    items: [
      { title: "EASY CHECK-IN", subtitle: "Simple arrival process", icon: "KeyRound" },
      { title: "24/7 SUPPORT", subtitle: "We're here to help anytime", icon: "Headphones" },
      { title: "CLEAN & SAFE", subtitle: "Professionally cleaned", icon: "ShieldCheck" },
      { title: "BOOK WITH CONFIDENCE", subtitle: "Secure booking", icon: "Hand" },
    ],
  },
};

export const SECTIONS = Object.keys(SECTION_SCHEMAS);
