import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = ["Restaurant", "Dental", "Real Estate", "Fitness", "Software", "Healthcare", "Legal", "Beauty & Salon"];
  for (const name of categories) {
    await prisma.category.upsert({ where: { name }, create: { name }, update: {} });
  }

  const restaurant = await prisma.category.findUnique({ where: { name: "Restaurant" } });
  if (restaurant) {
    const existing = await prisma.emailTemplate.findFirst({ where: { categoryId: restaurant.id } });
    if (!existing) {
      await prisma.emailTemplate.create({
        data: {
          name: "Restaurant Outreach Template",
          categoryId: restaurant.id,
          subject: "Helping {{business_name}} get more diners in {{city}}",
          body: `<p>Hi {{contact_name}},</p><p>I came across {{business_name}} while researching restaurants in {{city}} and wanted to reach out.</p><p>We help restaurants like yours grow online orders and reservations. Would you be open to a quick chat this week?</p><p>Best,<br/>Bro's Code</p>`,
          versions: {
            create: {
              version: 1,
              subject: "Helping {{business_name}} get more diners in {{city}}",
              body: `<p>Hi {{contact_name}},</p><p>I came across {{business_name}} while researching restaurants in {{city}} and wanted to reach out.</p><p>We help restaurants like yours grow online orders and reservations. Would you be open to a quick chat this week?</p><p>Best,<br/>Bro's Code</p>`,
            },
          },
        },
      });
    }
  }

  console.log("Seed complete: categories + sample Restaurant template created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
