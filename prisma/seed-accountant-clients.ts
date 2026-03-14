/**
 * YaadBooks - Accountant Client Seed Data
 * 
 * Creates sample accountant-client relationships for testing.
 * Run with: npx prisma db seed
 * Or manually: npx ts-node prisma/seed-accountant-clients.ts
 */

import { PrismaClient, AccountantClientStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAccountantClients() {
  console.log('🌱 Seeding Accountant-Client relationships...\n');

  // First, ensure we have test users and companies
  // In production, these would already exist

  // Create a sample accountant user
  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@testfirm.com' },
    update: {},
    create: {
      email: 'accountant@testfirm.com',
      firstName: 'Michelle',
      lastName: 'Brown',
      role: UserRole.ACCOUNTANT,
      passwordHash: '$2b$10$dummyhashforseeding', // Not a real password
      isActive: true,
    },
  });
  console.log(`✓ Accountant: ${accountant.firstName} ${accountant.lastName} (${accountant.email})`);

  // Create a second accountant for testing multiple accountants
  const accountant2 = await prisma.user.upsert({
    where: { email: 'senior.accountant@testfirm.com' },
    update: {},
    create: {
      email: 'senior.accountant@testfirm.com',
      firstName: 'David',
      lastName: 'Campbell',
      role: UserRole.ACCOUNTANT,
      passwordHash: '$2b$10$dummyhashforseeding',
      isActive: true,
    },
  });
  console.log(`✓ Accountant: ${accountant2.firstName} ${accountant2.lastName} (${accountant2.email})`);

  // Create sample client companies
  const companies = await Promise.all([
    prisma.company.upsert({
      where: { id: 'seed-company-jerk-palace' },
      update: {},
      create: {
        id: 'seed-company-jerk-palace',
        businessName: 'Jerk Palace Ltd',
        tradingName: 'Jerk Palace',
        businessType: 'LIMITED_COMPANY',
        trnNumber: '001-234-567',
        gctNumber: 'GCT-JP-001',
        gctRegistered: true,
        email: 'admin@jerkpalace.jm',
        phone: '+1 876 555 1001',
        addressParish: 'ST_ANDREW',
        addressCity: 'Kingston',
      },
    }),
    prisma.company.upsert({
      where: { id: 'seed-company-blue-mountain' },
      update: {},
      create: {
        id: 'seed-company-blue-mountain',
        businessName: 'Blue Mountain Coffee Exports',
        tradingName: 'Blue Mountain Coffee',
        businessType: 'LIMITED_COMPANY',
        trnNumber: '002-345-678',
        gctNumber: 'GCT-BMC-002',
        gctRegistered: true,
        email: 'info@bluemountaincoffee.jm',
        phone: '+1 876 555 2002',
        addressParish: 'PORTLAND',
        addressCity: 'Port Antonio',
      },
    }),
    prisma.company.upsert({
      where: { id: 'seed-company-reggae-records' },
      update: {},
      create: {
        id: 'seed-company-reggae-records',
        businessName: 'Reggae Records Studio',
        tradingName: 'Reggae Records',
        businessType: 'SOLE_PROPRIETOR',
        trnNumber: '003-456-789',
        gctRegistered: false,
        email: 'studio@reggaerecords.jm',
        phone: '+1 876 555 3003',
        addressParish: 'KINGSTON',
        addressCity: 'Kingston',
      },
    }),
    prisma.company.upsert({
      where: { id: 'seed-company-island-tours' },
      update: {},
      create: {
        id: 'seed-company-island-tours',
        businessName: 'Island Adventures Tours',
        tradingName: 'Island Tours',
        businessType: 'PARTNERSHIP',
        trnNumber: '004-567-890',
        gctNumber: 'GCT-IAT-004',
        gctRegistered: true,
        email: 'bookings@islandtours.jm',
        phone: '+1 876 555 4004',
        addressParish: 'ST_JAMES',
        addressCity: 'Montego Bay',
      },
    }),
  ]);

  console.log(`\n✓ Created ${companies.length} test companies`);

  // Create Accountant-Client relationships with different statuses
  const relationships = [
    // Michelle Brown manages Jerk Palace (ACTIVE)
    {
      accountantId: accountant.id,
      companyId: 'seed-company-jerk-palace',
      status: AccountantClientStatus.ACTIVE,
      invitedEmail: 'admin@jerkpalace.jm',
      acceptedAt: new Date('2026-01-15'),
      canAccessPayroll: true,
      canAccessBanking: true,
      canExportData: true,
      notes: 'Full-service accounting engagement. Monthly bookkeeping + quarterly tax prep.',
    },
    // Michelle Brown manages Blue Mountain Coffee (ACTIVE, limited permissions)
    {
      accountantId: accountant.id,
      companyId: 'seed-company-blue-mountain',
      status: AccountantClientStatus.ACTIVE,
      invitedEmail: 'cfo@bluemountaincoffee.jm',
      acceptedAt: new Date('2026-03-01'),
      canAccessPayroll: false, // They handle payroll in-house
      canAccessBanking: true,
      canExportData: true,
      notes: 'Tax filing and GCT compliance only. Payroll handled internally.',
    },
    // Michelle Brown invited Reggae Records (PENDING)
    {
      accountantId: accountant.id,
      companyId: 'seed-company-reggae-records',
      status: AccountantClientStatus.PENDING,
      invitedEmail: 'owner@reggaerecords.jm',
      acceptedAt: null,
      canAccessPayroll: true,
      canAccessBanking: true,
      canExportData: true,
      notes: 'Prospective client. Sent proposal on July 10.',
    },
    // David Campbell manages Island Tours (ACTIVE)
    {
      accountantId: accountant2.id,
      companyId: 'seed-company-island-tours',
      status: AccountantClientStatus.ACTIVE,
      invitedEmail: 'finance@islandtours.jm',
      acceptedAt: new Date('2026-02-20'),
      canAccessPayroll: true,
      canAccessBanking: true,
      canExportData: true,
      notes: 'Tourism sector client. Seasonal business - Q4 is peak.',
    },
    // David also helps with Blue Mountain Coffee (SUSPENDED example)
    {
      accountantId: accountant2.id,
      companyId: 'seed-company-blue-mountain',
      status: AccountantClientStatus.SUSPENDED,
      invitedEmail: 'cfo@bluemountaincoffee.jm',
      acceptedAt: new Date('2025-06-01'),
      canAccessPayroll: true,
      canAccessBanking: true,
      canExportData: true,
      notes: 'Secondary accountant. Access suspended pending invoice payment.',
    },
  ];

  for (const rel of relationships) {
    await prisma.accountantClient.upsert({
      where: {
        accountantId_companyId: {
          accountantId: rel.accountantId,
          companyId: rel.companyId,
        },
      },
      update: rel,
      create: rel,
    });
  }

  console.log(`\n✓ Created ${relationships.length} accountant-client relationships`);

  // Summary
  console.log('\n📊 Seed Summary:');
  console.log('================');
  console.log(`Accountants: 2`);
  console.log(`Companies: ${companies.length}`);
  console.log(`Relationships: ${relationships.length}`);
  console.log(`  - ACTIVE: 3`);
  console.log(`  - PENDING: 1`);
  console.log(`  - SUSPENDED: 1`);
  
  console.log('\n✅ Accountant-Client seed data complete!\n');
}

seedAccountantClients()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
