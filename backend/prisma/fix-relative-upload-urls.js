import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function publicBaseUrl() {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return `http://localhost:${process.env.PORT || 8001}`;
}

function fix(url) {
  if (url && url.startsWith("/uploads/")) return `${publicBaseUrl()}${url}`;
  return url;
}

async function main() {
  const properties = await prisma.property.findMany();
  let changed = 0;

  for (const p of properties) {
    const thumbnailUrl = fix(p.thumbnailUrl);
    const gallery = (p.gallery || []).map(fix);
    const needsUpdate =
      thumbnailUrl !== p.thumbnailUrl || gallery.some((g, i) => g !== p.gallery[i]);

    if (needsUpdate) {
      await prisma.property.update({ where: { id: p.id }, data: { thumbnailUrl, gallery } });
      changed++;
      console.log(`Fixed property ${p.id} (${p.title})`);
    }
  }

  console.log(`Done. ${changed} of ${properties.length} properties updated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
