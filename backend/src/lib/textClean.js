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
