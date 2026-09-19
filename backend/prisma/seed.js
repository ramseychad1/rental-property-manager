import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@rentalpropertymanager.com";
const ADMIN_PASSWORD = "Admin123!";
const GUEST_EMAIL = "guest@rentalpropertymanager.com";
const GUEST_PASSWORD = "Guest123!";

async function upsertUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role, isVerified: true },
  });
}

async function main() {
  const admin = await upsertUser({ name: "Ops Admin", email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "Admin" });
  await upsertUser({ name: "Demo Guest", email: GUEST_EMAIL, password: GUEST_PASSWORD, role: "Guest" });

  const existingCount = await prisma.property.count();
  if (existingCount === 0) {
    const dockside = await prisma.property.create({
      data: {
        title: "Dockside Retreat - Key Largo",
        description:
          "A boutique waterfront home with a private dock, ocean access, and room for the whole crew. Dock out back, sand bar up ahead.",
        status: "active",
        minNights: 2,
        maxNights: 21,
        guests: 8,
        bedrooms: 4,
        bathrooms: 3,
        rating: 4.9,
        amenities: ["Private Dock", "Ocean Access", "WiFi", "Pool", "Air Conditioning", "Free Parking"],
        locationAddress: "123 Sunset Cay Dr, Key Largo, FL",
        locationCity: "Key Largo",
        locationCountry: "United States",
        locationZipCode: "33037",
        locationUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d114558.0!2d-80.4!3d25.09!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjXCsDA1JzI0LjAiTiA4MMKwMjQnMDAuMCJX!5e0!3m2!1sen!2sus",
        priceNightly: 450,
        priceCurrency: "USD",
        priceCleaningFee: 150,
        priceServiceFee: 80,
        priceTaxRate: 7,
        thumbnailUrl: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80",
          "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=1200&q=80",
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
        ],
      },
    });

    await prisma.season.create({
      data: {
        propertyId: dockside.id,
        name: "Peak Winter Season",
        pricePerNight: 650,
        dateRanges: [{ startDate: `${new Date().getFullYear()}-12-15`, endDate: `${new Date().getFullYear() + 1}-01-05` }],
      },
    });

    await prisma.property.create({
      data: {
        title: "Sandbar Bungalow - Islamorada",
        description: "Relax and enjoy. Three minutes to the sandbar, world-class fishing and diving right outside your door.",
        status: "active",
        minNights: 3,
        guests: 6,
        bedrooms: 3,
        bathrooms: 2,
        rating: 4.8,
        amenities: ["Private Dock", "WiFi", "Kayaks Included", "Outdoor Shower"],
        locationAddress: "456 Overseas Hwy, Islamorada, FL",
        locationCity: "Islamorada",
        locationCountry: "United States",
        locationZipCode: "33036",
        locationUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d114558.0!2d-80.6!3d24.9!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDU0JzAwLjAiTiA4MMKwMzYnMDAuMCJX!5e0!3m2!1sen!2sus",
        priceNightly: 320,
        priceCurrency: "USD",
        priceCleaningFee: 120,
        priceServiceFee: 60,
        priceTaxRate: 7,
        thumbnailUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80",
          "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=1200&q=80",
        ],
      },
    });

    await prisma.property.create({
      data: {
        title: "Breathtaking Sunrise House - Marathon",
        description: "Wake up to breathtaking sunrises over the Atlantic. World class fishing and diving minutes away.",
        status: "active",
        minNights: 2,
        guests: 10,
        bedrooms: 5,
        bathrooms: 4,
        rating: 5.0,
        amenities: ["Private Dock", "Ocean Access", "WiFi", "Pool", "Hot Tub", "Free Parking"],
        locationAddress: "789 Ocean Dr, Marathon, FL",
        locationCity: "Marathon",
        locationCountry: "United States",
        locationZipCode: "33050",
        locationUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d114558.0!2d-81.1!3d24.7!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDQyJzAwLjAiTiA4McKwMDYnMDAuMCJX!5e0!3m2!1sen!2sus",
        priceNightly: 580,
        priceCurrency: "USD",
        priceCleaningFee: 180,
        priceServiceFee: 90,
        priceTaxRate: 7,
        thumbnailUrl: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80",
          "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=80",
        ],
      },
    });

    console.log("Seeded 3 demo properties.");
  } else {
    console.log(`Properties already present (${existingCount}) - skipping property seed.`);
  }

  console.log("\nSeed complete.");
  console.log(`Admin login:  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Guest login:  ${GUEST_EMAIL} / ${GUEST_PASSWORD}\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
