import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...\n');

  // 1. Seed Roles
  console.log('Creating roles...');
  const roles = ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { id: roles.indexOf(name) + 1 },
      update: { name },
      create: { name },
    });
  }
  console.log('  Roles created: ROLE_ADMIN, ROLE_MODERATOR, ROLE_USER');

  // 2. Seed Statuses
  console.log('Creating statuses...');
  await prisma.lkStatus.upsert({
    where: { statusId: 1 },
    update: {},
    create: { statusId: 1, descEn: 'Active', desc1: 'Active' },
  });
  await prisma.lkStatus.upsert({
    where: { statusId: 2 },
    update: {},
    create: { statusId: 2, descEn: 'Inactive', desc1: 'Inactive' },
  });

  // 3. Seed Currencies
  console.log('Creating currencies...');
  const currencies = [
    { currencyId: 1, currencyCodes: 'USD', descEn: 'US Dollar', symbol: '$' },
    { currencyId: 2, currencyCodes: 'EUR', descEn: 'Euro', symbol: '€' },
    { currencyId: 3, currencyCodes: 'GBP', descEn: 'British Pound', symbol: '£' },
  ];
  for (const c of currencies) {
    await prisma.lkCurrency.upsert({
      where: { currencyId: c.currencyId },
      update: {},
      create: c,
    });
  }

  // 4. Seed Price Percentage (recovery rates)
  console.log('Creating price percentages...');
  await prisma.pricePercentage.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, pt: 95.0, pd: 95.0, rh: 85.0 },
  });

  // 5. Seed Metal Prices (defaults)
  console.log('Creating default metal prices...');
  const metalPrices = [
    { name: 'Platinum', price: 950.0, currencyId: 1 },
    { name: 'Palladium', price: 1050.0, currencyId: 1 },
    { name: 'Rhodium', price: 4500.0, currencyId: 1 },
  ];
  for (const mp of metalPrices) {
    const existing = await prisma.priceMetals.findFirst({
      where: { name: mp.name, currencyId: mp.currencyId },
    });
    if (!existing) {
      await prisma.priceMetals.create({
        data: { ...mp, date: new Date() },
      });
    }
  }

  // 6. Seed Plans
  console.log('Creating subscription plans...');
  const plans = [
    {
      slug: 'free',
      name: 'Free',
      monthlyCredits: 0,
      priceCents: 0,
      features: {
        exactPrices: false,
        metalBreakdown: false,
        priceHistory: false,
        savedSearches: false,
        unlimitedAi: false,
        apiAccess: false,
        bulkExport: false,
        teamFeatures: false,
        dailyCap: 20,
      },
    },
    {
      slug: 'starter',
      name: 'Starter',
      monthlyCredits: 150,
      priceCents: 1999,
      features: {
        exactPrices: true,
        metalBreakdown: true,
        priceHistory: false,
        savedSearches: false,
        unlimitedAi: false,
        apiAccess: false,
        bulkExport: false,
        teamFeatures: false,
        dailyCap: 150,
      },
    },
    {
      slug: 'pro',
      name: 'Pro',
      monthlyCredits: 500,
      priceCents: 3999,
      features: {
        exactPrices: true,
        metalBreakdown: true,
        priceHistory: true,
        savedSearches: true,
        unlimitedAi: true,
        apiAccess: false,
        bulkExport: false,
        teamFeatures: false,
        dailyCap: 500,
      },
    },
    {
      slug: 'business',
      name: 'Business',
      monthlyCredits: -1,
      priceCents: 6999,
      features: {
        exactPrices: true,
        metalBreakdown: true,
        priceHistory: true,
        savedSearches: true,
        unlimitedAi: true,
        apiAccess: true,
        bulkExport: true,
        teamFeatures: true,
        dailyCap: 2000,
      },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: { ...plan, features: plan.features },
      create: { ...plan, features: plan.features },
    });
  }

  // 7. Seed Admin User
  console.log('Creating admin user...');
  const adminPassword = await bcrypt.hash('Admin@2024!Secure', 12);
  const adminRole = await prisma.role.findFirst({ where: { name: 'ROLE_ADMIN' } });
  const userRole = await prisma.role.findFirst({ where: { name: 'ROLE_USER' } });

  const existingAdmin = await prisma.user.findFirst({ where: { email: 'admin@alphapgm.com' } });

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        email: 'admin@alphapgm.com',
        username: 'admin',
        password: adminPassword,
        name: 'Platform Admin',
        statusId: 1,
        createdDate: new Date(),
        lastAccess: new Date(),
      },
    });

    // Assign both ADMIN and USER roles
    if (adminRole) {
      await prisma.userRole.create({
        data: { userId: admin.userId, roleId: adminRole.id },
      });
    }
    if (userRole) {
      await prisma.userRole.create({
        data: { userId: admin.userId, roleId: userRole.id },
      });
    }

    // Create credit balance (unlimited for admin)
    await prisma.creditBalance.create({
      data: {
        userId: admin.userId,
        available: 999999,
        lifetimeEarned: 999999,
        lifetimeSpent: 0,
      },
    });

    // Create settings
    await prisma.settingUser.create({
      data: {
        userId: admin.userId,
        discount: 0,
        restDiscount: false,
        currencyId: 1,
      },
    });

    // Subscribe admin to Business plan
    const businessPlan = await prisma.plan.findUnique({ where: { slug: 'business' } });
    if (businessPlan) {
      await prisma.subscription.create({
        data: {
          userId: admin.userId,
          planId: businessPlan.id,
          status: 'active',
          provider: 'manual',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });
    }

    console.log('  Admin user created successfully!');
  } else {
    console.log('  Admin user already exists, skipping...');
  }

  // 8. Seed Demo User (optional)
  const existingDemo = await prisma.user.findFirst({ where: { email: 'demo@alphapgm.com' } });

  if (!existingDemo) {
    console.log('Creating demo user...');
    const demoPassword = await bcrypt.hash('Demo@2024!User', 12);

    const demo = await prisma.user.create({
      data: {
        email: 'demo@alphapgm.com',
        username: 'demo',
        password: demoPassword,
        name: 'Demo User',
        statusId: 1,
        createdDate: new Date(),
        lastAccess: new Date(),
      },
    });

    if (userRole) {
      await prisma.userRole.create({
        data: { userId: demo.userId, roleId: userRole.id },
      });
    }

    await prisma.creditBalance.create({
      data: {
        userId: demo.userId,
        available: 20,
        lifetimeEarned: 20,
        lifetimeSpent: 0,
      },
    });

    await prisma.settingUser.create({
      data: {
        userId: demo.userId,
        discount: 0,
        restDiscount: false,
        currencyId: 1,
      },
    });

    console.log('  Demo user created successfully!');
  }

  console.log('\n========================================');
  console.log('  Database seeded successfully!');
  console.log('========================================');
  console.log('');
  console.log('  Admin Credentials:');
  console.log('  Email:    admin@alphapgm.com');
  console.log('  Password: Admin@2024!Secure');
  console.log('');
  console.log('  Demo Credentials:');
  console.log('  Email:    demo@alphapgm.com');
  console.log('  Password: Demo@2024!User');
  console.log('');
  console.log('  IMPORTANT: Change these passwords');
  console.log('  in production!');
  console.log('========================================');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
