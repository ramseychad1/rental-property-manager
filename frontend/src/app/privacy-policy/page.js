export const metadata = {
  title: "Privacy Policy | Rental Property Manager",
  description: "Privacy policy for Rental Property Manager vacation rental guests.",
};

const sections = [
  {
    title: "Information we collect",
    body: "We may collect booking details, contact information, payment-related references, and messages you send through this website. This placeholder policy should be reviewed by legal counsel before production use.",
  },
  {
    title: "How we use information",
    body: "We use guest information to respond to inquiries, manage reservations, provide concierge services, improve the website, and send important booking updates.",
  },
  {
    title: "Sharing",
    body: "We only share information with service providers when needed to operate the reservation, support, email, analytics, or security parts of the business.",
  },
  {
    title: "Connecting a Gmail account (property owners and administrators)",
    paragraphs: [
      "Property owners and administrators can optionally connect their own Gmail account so booking emails are sent from their address. When you connect, Google asks you to allow one permission only: \"Send email on your behalf\". We also receive the email address of the account you connect.",
      "We use this access solely to send emails for the rental service: booking confirmations, status updates and payment notices to guests, new-booking alerts to owners, and, for the platform administrator's connected account, sign-up verification codes, password reset codes and contact-form messages.",
      "We do not read, search, change or delete any email, contacts or other data in your Google account, and we cannot. The messages we send appear in your Gmail Sent folder.",
      "We store the connected email address and an encrypted access token so we can send on your behalf. We also keep a basic log of each send (recipient address, subject, time and whether it succeeded) but not the message contents. We do not sell this information, use it for advertising, or share it with third parties, except as required by law.",
      "You can disconnect at any time from Settings > Email in the admin panel, which deletes the stored token, or by removing the app at myaccount.google.com/permissions.",
      "Our use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including its Limited Use requirements.",
    ],
    link: {
      href: "https://developers.google.com/terms/api-services-user-data-policy",
      text: "Google API Services User Data Policy",
    },
  },
  {
    title: "Your choices",
    body: "You can request corrections or deletion of your personal information where applicable by contacting our support team.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="font-display text-4xl font-bold text-[var(--color-primary)]">
        Privacy Policy
      </h1>
      <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
        Last updated: September 20, 2026
      </p>
      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-2xl font-semibold">{section.title}</h2>
            {(section.paragraphs ?? [section.body]).map((text) => (
              <p key={text} className="mt-3 leading-relaxed text-[var(--color-muted-foreground)]">
                {text}
              </p>
            ))}
            {section.link && (
              <p className="mt-3">
                <a
                  href={section.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary)] underline"
                >
                  {section.link.text}
                </a>
              </p>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
