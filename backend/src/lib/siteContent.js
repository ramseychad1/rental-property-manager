import { z } from "zod";

// Editable public-site content: homepage sections plus site-wide settings and
// the Properties / Services / Contact / Privacy / Refund pages. Each section has a zod schema (validates admin
// input) and a generic-placeholder default (used until the admin saves that
// section). Colors are 6-digit hex strings; images are absolute URLs from
// POST /api/site-content/upload, or "" for none.

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #0b7c83");
const text = (max = 300) => z.string().trim().max(max);
const image = z.string().trim().max(1000);
const icon = z.string().trim().max(40);

const iconItem = z.object({ title: text(60), subtitle: text(120), icon });

const optionalUrl = z.string().trim().max(500).refine((v) => v === "" || /^https?:\/\//i.test(v), "Must start with http:// or https://");
const email = z.string().trim().max(200).refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address");

// Banner colors shared by the inner pages' top banner.
const bannerColors = { backgroundColor: color, textColor: color };

// A policy page: title, "last updated" text, then titled sections whose body
// is plain text (blank line = new paragraph; bare URLs become links).
const policySchema = z.object({
  title: text(100),
  lastUpdated: text(60),
  metaDescription: text(300),
  sections: z.array(z.object({ title: text(160), body: text(6000) })).max(30),
});

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

  // ---- site-wide ----
  brand: z.object({
    siteName: text(80),
    tagline: text(200),
    phone: text(40),
    email,
    address: text(200),
    facebook: optionalUrl,
    instagram: optionalUrl,
    tiktok: optionalUrl,
    x: optionalUrl,
  }),
  seo: z.object({
    title: text(120),
    description: text(300),
    keywords: text(300), // comma separated
    shareImage: image,
  }),

  // ---- inner pages ----
  propertiesPage: z.object({
    headline: text(120),
    ...bannerColors,
    features: z.array(z.object({ title: text(40), subtitle: text(80), icon })).max(4),
    emptyMessage: text(200),
    metaDescription: text(300),
  }),
  servicesPage: z.object({
    heading: text(120),
    intro: text(400),
    ...bannerColors,
    metaDescription: text(300),
    services: z
      .array(
        z.object({
          title: text(120),
          image,
          price: z.coerce.number().min(0).max(1_000_000),
          priceNote: text(80),
          shortDescription: text(300),
          description: text(2000),
        }),
      )
      .max(30),
  }),
  contactPage: z.object({
    heading: text(120),
    intro: text(400),
    ...bannerColors,
    locationLabel: text(200), // shown in the details column; blank hides it
    mapQuery: text(200), // address/place for the map; blank hides the map
    successMessage: text(200),
    metaDescription: text(300),
  }),
  thingsPage: z.object({
    heading: text(120),
    intro: text(400),
    ...bannerColors,
    emptyMessage: text(200),
    metaDescription: text(300),
  }),
  privacyPage: policySchema,
  refundPage: policySchema,
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

  brand: {
    siteName: "Rental Property Manager",
    tagline: "Vacation rentals, handled with care.",
    phone: "",
    email: "",
    address: "",
    facebook: "",
    instagram: "",
    tiktok: "",
    x: "",
  },
  seo: {
    title: "Rental Property Manager",
    description: "Find and book vacation rentals with friendly local support.",
    keywords: "",
    shareImage: "",
  },
  propertiesPage: {
    headline: "Find your perfect stay",
    backgroundColor: "#0b7c83",
    textColor: "#ffffff",
    features: [
      { title: "Handpicked", subtitle: "Only the best stays", icon: "Star" },
      { title: "Stress Free", subtitle: "Easy booking", icon: "ShieldCheck" },
      { title: "Local Support", subtitle: "Here for you", icon: "Headphones" },
    ],
    emptyMessage: "No properties available right now. Check back soon.",
    metaDescription: "Browse our vacation rental properties and book your stay.",
  },
  servicesPage: {
    heading: "Services We Offer",
    intro: "",
    backgroundColor: "#0b7c83",
    textColor: "#ffffff",
    metaDescription: "Add optional extras to your stay.",
    services: [
      {
        title: "Example service",
        image: "",
        price: 100,
        priceNote: "single charge, per stay",
        shortDescription: "A short summary guests see first.",
        description: "A longer description guests see after clicking View more. Replace this with details about your service.",
      },
      {
        title: "Another example service",
        image: "",
        price: 250,
        priceNote: "per person",
        shortDescription: "Another short summary.",
        description: "More detail about this service.",
      },
    ],
  },
  contactPage: {
    heading: "Get in touch",
    intro: "Questions about a stay or a booking? Drop us a line and we'll get back to you.",
    backgroundColor: "#0b7c83",
    textColor: "#ffffff",
    locationLabel: "",
    mapQuery: "",
    successMessage: "Thanks! We'll be in touch soon.",
    metaDescription: "Contact us with questions about a stay.",
  },
  thingsPage: {
    heading: "Things to do nearby",
    intro: "Our favorite local spots, sorted by the kind of day you want.",
    backgroundColor: "#0b7c83",
    textColor: "#ffffff",
    emptyMessage: "Nothing has been added yet. Check back soon.",
    metaDescription: "Local restaurants, activities and favorites near our rentals.",
  },
  privacyPage: {
    title: "Privacy Policy",
    lastUpdated: "September 20, 2026",
    metaDescription: "How we collect, use and protect your information.",
    sections: [
      {
          "title": "Information we collect",
          "body": "We may collect booking details, contact information, payment-related references, and messages you send through this website. This placeholder policy should be reviewed by legal counsel before production use."
      },
      {
          "title": "How we use information",
          "body": "We use guest information to respond to inquiries, manage reservations, provide concierge services, improve the website, and send important booking updates."
      },
      {
          "title": "Sharing",
          "body": "We only share information with service providers when needed to operate the reservation, support, email, analytics, or security parts of the business."
      },
      {
          "title": "Connecting a Gmail account (property owners and administrators)",
          "body": "Property owners and administrators can optionally connect their own Gmail account so booking emails are sent from their address. When you connect, Google asks you to allow one permission only: \"Send email on your behalf\". We also receive the email address of the account you connect.\n\nWe use this access solely to send emails for the rental service: booking confirmations, status updates and payment notices to guests, new-booking alerts to owners, and, for the platform administrator's connected account, sign-up verification codes, password reset codes and contact-form messages.\n\nWe do not read, search, change or delete any email, contacts or other data in your Google account, and we cannot. The messages we send appear in your Gmail Sent folder.\n\nWe store the connected email address and an encrypted access token so we can send on your behalf. We also keep a basic log of each send (recipient address, subject, time and whether it succeeded) but not the message contents. We do not sell this information, use it for advertising, or share it with third parties, except as required by law.\n\nYou can disconnect at any time from Settings > Email in the admin panel, which deletes the stored token, or by removing the app at myaccount.google.com/permissions.\n\nOur use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including its Limited Use requirements.\n\nGoogle API Services User Data Policy: https://developers.google.com/terms/api-services-user-data-policy"
      },
      {
          "title": "Your choices",
          "body": "You can request corrections or deletion of your personal information where applicable by contacting our support team."
      }
  ],
  },
  refundPage: {
    title: "Refund Policy",
    lastUpdated: "May 17, 2026",
    metaDescription: "Refund and cancellation policy for stays.",
    sections: [
      {
          "title": "Reservation requests",
          "body": "Submitting a reservation request does not charge your card immediately. Our team confirms availability and payment details before a booking is finalized."
      },
      {
          "title": "Cancellations",
          "body": "This sample policy allows full refunds for eligible cancellations made at least 30 days before check-in, partial refunds between 14 and 29 days, and no refund inside 14 days."
      },
      {
          "title": "Weather and disruptions",
          "body": "Weather-related refunds may depend on local emergency orders, property access, and the terms confirmed with the guest at booking time."
      },
      {
          "title": "Service add-ons",
          "body": "Concierge add-ons such as chefs, captains, and grocery stocking may have separate vendor cancellation windows."
      }
  ],
  },
};

export const SECTIONS = Object.keys(SECTION_SCHEMAS);
