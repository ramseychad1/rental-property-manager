/**
 * VERTICAL CONFIG — single source of truth for the rental industry this build serves.
 *
 * Switch verticals by changing the `active` export. Add new verticals as needed.
 * Pages and components reference `vertical` (NOT "property") so the same UI works
 * for cars, bikes, equipment, hotel rooms, etc.
 */

import {
  Building2,
  Car,
  Bike,
  Wrench,
  BedDouble,
  Hotel,
  MapPin,
  Users,
  BedSingle,
  Bath,
  Fuel,
  Gauge,
  Cog,
  Calendar,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Preset: Property rentals (default — Rental Property Manager backend)                   */
/* -------------------------------------------------------------------------- */
const propertyVertical = {
  key: "property",
  brand: {
    name: "Powell Properties",
    tagline: "Property Operations",
    productName: "Powell Properties · Property Rentals",
  },
  item: {
    singular: "Property",
    plural: "Properties",
    slug: "properties",
    icon: Building2,
    capacityIcons: {
      guests: { icon: Users, label: "Guests" },
      bedrooms: { icon: BedSingle, label: "Bedrooms" },
      bathrooms: { icon: Bath, label: "Bathrooms" },
    },
    capacityFields: ["guests", "bedrooms", "bathrooms"],
    statusOptions: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
  amenities: [
    "Wi-Fi",
    "Pool",
    "Air Conditioning",
    "Heating",
    "Kitchen",
    "Washer",
    "Dryer",
    "Free Parking",
    "Gym",
    "Hot Tub",
    "Beachfront",
    "Workspace",
    "EV Charger",
    "Pet Friendly",
    "Balcony",
    "BBQ",
  ],
  copy: {
    listSubtitle: "Manage your rental portfolio across all locations.",
    detailLocationLabel: "Address",
    booking: "Booking",
    bookings: "Bookings",
    pricingRule: "Season",
    pricingRules: "Seasons",
  },
};

/* -------------------------------------------------------------------------- */
/*  Preset: Car rentals — drop-in replacement                                  */
/* -------------------------------------------------------------------------- */
// eslint-disable-next-line no-unused-vars
const carVertical = {
  key: "car",
  brand: {
    name: "Driveway",
    tagline: "Vehicle Operations",
    productName: "Driveway · Car Rentals",
  },
  item: {
    singular: "Vehicle",
    plural: "Vehicles",
    slug: "vehicles",
    icon: Car,
    capacityIcons: {
      guests: { icon: Users, label: "Seats" },
      bedrooms: { icon: Fuel, label: "Fuel" },
      bathrooms: { icon: Gauge, label: "Transmission" },
    },
    capacityFields: ["guests", "bedrooms", "bathrooms"],
    statusOptions: [
      { value: "active", label: "Available" },
      { value: "inactive", label: "Maintenance" },
    ],
  },
  amenities: [
    "Bluetooth",
    "GPS",
    "Sunroof",
    "Leather Seats",
    "Backup Camera",
    "Apple CarPlay",
    "Android Auto",
    "Heated Seats",
    "All-wheel Drive",
    "Cruise Control",
    "Roof Rack",
    "Tow Hitch",
  ],
  copy: {
    listSubtitle: "Track your fleet across all rental locations.",
    detailLocationLabel: "Pickup location",
    booking: "Reservation",
    bookings: "Reservations",
    pricingRule: "Rate Period",
    pricingRules: "Rate Periods",
  },
};

/* -------------------------------------------------------------------------- */
/*  Preset: Bike rentals                                                       */
/* -------------------------------------------------------------------------- */
// eslint-disable-next-line no-unused-vars
const bikeVertical = {
  key: "bike",
  brand: {
    name: "Wheelhouse",
    tagline: "Bike Operations",
    productName: "Wheelhouse · Bike Rentals",
  },
  item: {
    singular: "Bike",
    plural: "Bikes",
    slug: "bikes",
    icon: Bike,
    capacityIcons: {
      guests: { icon: Gauge, label: "Frame size" },
      bedrooms: { icon: Cog, label: "Gears" },
      bathrooms: { icon: Wrench, label: "Type" },
    },
    capacityFields: ["guests", "bedrooms", "bathrooms"],
    statusOptions: [
      { value: "active", label: "Available" },
      { value: "inactive", label: "Service" },
    ],
  },
  amenities: ["Helmet", "Lock", "Lights", "Pannier", "Phone Mount", "Pump"],
  copy: {
    listSubtitle: "Manage your bike fleet and rentals.",
    detailLocationLabel: "Pickup point",
    booking: "Rental",
    bookings: "Rentals",
    pricingRule: "Rate Period",
    pricingRules: "Rate Periods",
  },
};

/* -------------------------------------------------------------------------- */
/*  Preset: Equipment rentals                                                  */
/* -------------------------------------------------------------------------- */
// eslint-disable-next-line no-unused-vars
const equipmentVertical = {
  key: "equipment",
  brand: {
    name: "ToolKit",
    tagline: "Equipment Operations",
    productName: "ToolKit · Equipment Rentals",
  },
  item: {
    singular: "Asset",
    plural: "Assets",
    slug: "assets",
    icon: Wrench,
    capacityIcons: {
      guests: { icon: Users, label: "Operators" },
      bedrooms: { icon: Calendar, label: "Min duration" },
      bathrooms: { icon: Cog, label: "Power" },
    },
    capacityFields: ["guests", "bedrooms", "bathrooms"],
    statusOptions: [
      { value: "active", label: "Available" },
      { value: "inactive", label: "Out of service" },
    ],
  },
  amenities: ["Carry case", "Manual", "Charger", "Spare parts", "Insurance"],
  copy: {
    listSubtitle: "Manage your equipment inventory.",
    detailLocationLabel: "Warehouse",
    booking: "Rental",
    bookings: "Rentals",
    pricingRule: "Rate Period",
    pricingRules: "Rate Periods",
  },
};

/* -------------------------------------------------------------------------- */
/*  Preset: Hotel/Apartment rentals                                            */
/* -------------------------------------------------------------------------- */
// eslint-disable-next-line no-unused-vars
const hotelVertical = {
  key: "hotel",
  brand: {
    name: "Suite",
    tagline: "Hospitality Operations",
    productName: "Suite · Hotel Rentals",
  },
  item: {
    singular: "Room",
    plural: "Rooms",
    slug: "rooms",
    icon: Hotel,
    capacityIcons: {
      guests: { icon: Users, label: "Occupancy" },
      bedrooms: { icon: BedDouble, label: "Beds" },
      bathrooms: { icon: Bath, label: "Bathrooms" },
    },
    capacityFields: ["guests", "bedrooms", "bathrooms"],
    statusOptions: [
      { value: "active", label: "Bookable" },
      { value: "inactive", label: "Closed" },
    ],
  },
  amenities: ["Wi-Fi", "Mini-bar", "Safe", "TV", "Balcony", "Sea view", "City view", "Room service"],
  copy: {
    listSubtitle: "Manage your room inventory.",
    detailLocationLabel: "Location",
    booking: "Reservation",
    bookings: "Reservations",
    pricingRule: "Rate Plan",
    pricingRules: "Rate Plans",
  },
};

/* -------------------------------------------------------------------------- */
/*  Active vertical                                                            */
/*  Change this single line to swap industries (or expose a runtime switcher)  */
/* -------------------------------------------------------------------------- */
export const vertical = propertyVertical;

// Available presets — handy for a future runtime "vertical switcher".
export const verticals = {
  property: propertyVertical,
  car: carVertical,
  bike: bikeVertical,
  equipment: equipmentVertical,
  hotel: hotelVertical,
};

export const locationFieldIcon = MapPin;
