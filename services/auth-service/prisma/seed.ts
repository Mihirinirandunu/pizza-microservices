import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedUsers(client: PrismaClient = prisma): Promise<void> {
  const adminPasswordHash = await bcrypt.hash('Owner123!', 10);
  await client.user.upsert({
    where: { email: 'owner@pizzashop.local' },
    update: {},
    create: {
      email: 'owner@pizzashop.local',
      name: 'Mario Rossi (Shop Owner)',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const customerPasswordHash = await bcrypt.hash('Customer123!', 10);
  await client.user.upsert({
    where: { email: 'customer@pizzashop.local' },
    update: {},
    create: {
      email: 'customer@pizzashop.local',
      name: 'Alice Pepperoni',
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
    },
  });
}

if (require.main === module) {
  seedUsers()
    .then(() => {
      console.log('Auth seed completed');
      return prisma.$disconnect();
    })
    .catch(async (err) => {
      console.error('Auth seed failed:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
