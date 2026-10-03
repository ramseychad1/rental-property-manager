// Text pasted from Word/Pages/web pages often carries characters the PDF's
// built-in Helvetica can't draw (they show up as boxes or stray symbols such
// as a "Đ" at every line end): carriage returns, line/paragraph separators,
// vertical tabs, tabs, non-breaking spaces, arrows, emoji, etc.

// Line breaks only: normalizes every flavor to "\n". Safe to apply on save.
export const normalizeNewlines = (s) =>
  String(s ?? "").replace(/\r\n|[\r\v\f\u0085\u2028\u2029]/g, "\n");

// Everything a standard PDF font (WinAnsi) can print; anything else is dropped
// or mapped to a close ASCII equivalent.
export function cleanForPdf(s) {
  return normalizeNewlines(s)
    .replace(/\t/g, "    ")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2010\u2011\u2012\u2212]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/[^\n\x20-\x7E\xA1-\xFF\u2018\u2019\u201C\u201D\u2013\u2014\u2022\u2026\u20AC\u2122]/g, "");
}

// Rules text pasted from a PDF/Word is hard-wrapped at the source's line width
// (every ~100 characters), which leaves ragged, broken lines in our PDF. This
// joins those wrapped lines back into paragraphs while keeping blank lines,
// headings ("PARKING:"), list items and deliberately short lines as they are.
// Heuristic: a line is a wrap (not a deliberate break) when it is nearly as
// long as the longest lines in the text and the next line continues the prose.
const LIST_ITEM = /^\s*([-*\u2022]|\d+[.)]|[a-z][.)])\s/i;
const isHeading = (l) => /^[A-Z0-9][A-Z0-9 '&\/,.()-]*:$/.test(l.trim());

export function reflowParagraphs(text) {
  const lines = normalizeNewlines(text).split("\n");
  const lengths = lines.map((l) => l.trim().length).filter(Boolean).sort((a, b) => a - b);
  if (lengths.length < 3) return lines.join("\n");
  const wrapWidth = lengths[Math.floor(lengths.length * 0.9)];
  const minWrapped = wrapWidth * 0.6;

  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, "");
    const prev = out.length ? out[out.length - 1] : "";
    const prevSource = i > 0 ? lines[i - 1].trim() : "";
    const joinToPrev =
      out.length > 0 &&
      line.trim() !== "" &&
      prevSource.length >= minWrapped &&
      // A sentence that ends clearly short of the wrap width ends its paragraph.
      !(/[.!?:)"\u201D]$/.test(prevSource) && prevSource.length < wrapWidth * 0.85) &&
      prev.trim() !== "" &&
      !isHeading(prevSource) &&
      !isHeading(line) &&
      !LIST_ITEM.test(line);
    if (joinToPrev) out[out.length - 1] = `${prev} ${line.trim()}`;
    else out.push(line);
  }
  return out.join("\n");
}
