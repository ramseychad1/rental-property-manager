import { isValidPhoneNumber } from "react-phone-number-input";

export const US_STATES = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
];

export const EMPTY_CONTACT = { phone: "", street: "", city: "", state: "", zip: "" };

// A user's saved contact details, shaped for the form (used to prefill).
export const contactFromUser = (u) => ({
  phone: u?.phone || "",
  street: u?.address?.street || "",
  city: u?.address?.city || "",
  state: u?.address?.state || "",
  zip: u?.address?.zip || "",
});

// Returns an error message, or "" when valid. Any valid US phone number is
// accepted (mobile vs landline isn't checked).
export function validateContact(c) {
  if (!c.phone || !isValidPhoneNumber(c.phone, "US")) return "Enter a valid US mobile phone number.";
  if (!c.street.trim()) return "Enter your street address.";
  if (!c.city.trim()) return "Enter your city.";
  if (!c.state) return "Select your state.";
  if (!/^\d{5}(-\d{4})?$/.test(c.zip.trim())) return "Enter a valid 5-digit ZIP code.";
  return "";
}
