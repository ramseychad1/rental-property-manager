// Turns a property's owner-defined payment terms into a booking's concrete,
// dollar-amount installments. Called once, at the moment a booking is
// accepted (see booking.controller.js) - the result is a snapshot on the
// booking, so later edits to the property's terms never rewrite it.
//
// A term is {id, label, percent, dueType, offset}:
//   dueType "immediate"              - due at acceptance (offset ignored)
//   dueType "months_before_checkin"  - due date = checkIn minus `offset` months
//   dueType "days_before_checkin"    - due date = checkIn minus `offset` days

export function dueDateFor(term, checkIn, now) {
  if (term.dueType === "immediate") return now;
  const d = new Date(checkIn);
  if (term.dueType === "months_before_checkin") d.setMonth(d.getMonth() - term.offset);
  else d.setDate(d.getDate() - term.offset);
  return d;
}

// Builds the installment rows for a booking. `total` is the booking's
// totalAmount (nightly + cleaning + service fee + tax, matching the "full
// total" decision). Amounts are rounded per-term and the last term absorbs any
// rounding remainder so they always sum to exactly `total`. The property's
// flat security deposit, if enabled, is added to whichever installment is due
// earliest (the "first payment").
export function buildInstallments({ property, checkIn, total, now = new Date() }) {
  const terms = Array.isArray(property.paymentTerms) ? property.paymentTerms : [];
  if (!terms.length) return [];

  const withDates = terms
    .map((t) => ({ label: t.label, percent: t.percent, dueDate: dueDateFor(t, checkIn, now) }))
    .sort((a, b) => a.dueDate - b.dueDate);

  let allocated = 0;
  const rows = withDates.map((t, idx) => {
    const isLast = idx === withDates.length - 1;
    const amount = isLast ? total - allocated : Math.round((total * t.percent) / 100);
    allocated += amount;
    return {
      order: idx,
      label: t.label,
      percent: t.percent,
      amount,
      dueDate: t.dueDate,
      includesDeposit: false,
      depositAmount: 0,
      paid: false,
    };
  });

  if (property.depositEnabled && property.depositAmount > 0) {
    rows[0].amount += property.depositAmount;
    rows[0].includesDeposit = true;
    rows[0].depositAmount = property.depositAmount;
  }

  return rows;
}

// Percentages must add up to 100 (small float tolerance). No-op for an empty
// schedule - that just means "no schedule configured", the legacy single
// paymentStatus flow.
export function assertTermsSumTo100(terms) {
  if (!terms.length) return;
  const sum = terms.reduce((s, t) => s + Number(t.percent || 0), 0);
  if (Math.abs(sum - 100) > 0.05) {
    const err = new Error(`Payment terms must add up to 100% (currently ${sum.toFixed(1)}%).`);
    err.status = 422;
    throw err;
  }
}
