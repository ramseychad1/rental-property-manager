// Icons an admin can pick for homepage highlight/feature items. Keep the names
// in sync with ICON_OPTIONS in admin/src/pages/siteContent/SiteContent.jsx.
import {
  Anchor, Bed, Users, Waves, Wifi, Sunset, TreePalm, Wind, MapPin, Star, Heart,
  Sun, Umbrella, Ship, Fish, KeyRound, Headphones, ShieldCheck, Hand, Car,
  Utensils, Dumbbell, Trees, Flame, Coffee, Bike,
} from "lucide-react";

const ICONS = {
  Anchor, Bed, Users, Waves, Wifi, Sunset, TreePalm, Wind, MapPin, Star, Heart,
  Sun, Umbrella, Ship, Fish, KeyRound, Headphones, ShieldCheck, Hand, Car,
  Utensils, Dumbbell, Trees, Flame, Coffee, Bike,
};

export function getIcon(name) {
  return ICONS[name] ?? Star;
}
