// Renders an admin-edited policy page (Privacy, Refund). Section bodies are
// plain text: a blank line starts a new paragraph and bare URLs become links.
const URL_RE = /(https?:\/\/[^\s]+)/g;

function Linkified({ text }) {
  return text.split(URL_RE).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline break-all">
        {part}
      </a>
    ) : (
      part
    ),
  );
}

export default function PolicyPage({ content }) {
  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="font-display text-4xl font-bold text-[var(--color-primary)]">{content.title}</h1>
      {content.lastUpdated && (
        <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">Last updated: {content.lastUpdated}</p>
      )}
      <div className="mt-8 space-y-8">
        {(content.sections ?? []).map((section, i) => (
          <section key={i}>
            <h2 className="font-display text-2xl font-semibold">{section.title}</h2>
            {String(section.body ?? "")
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((para, j) => (
                <p key={j} className="mt-3 leading-relaxed text-[var(--color-muted-foreground)]">
                  <Linkified text={para} />
                </p>
              ))}
          </section>
        ))}
      </div>
    </article>
  );
}
