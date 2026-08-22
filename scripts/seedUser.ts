import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@travelplanner.com" },
    update: {},
    create: {
      email: "demo@travelplanner.com",
      name: "Demo User",
    },
  });
  console.log("Demo user ready:", user.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());