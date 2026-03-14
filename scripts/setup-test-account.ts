/**
 * Setup Test Service Account for Automated Testing
 * 
 * Run: npx tsx scripts/setup-test-account.ts
 * 
 * Creates a dedicated test account with full access for:
 * - Stress testing
 * - Penetration testing
 * - API validation
 * - Automated QA
 */

import { PrismaClient, UserRole, SubscriptionTier } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TEST_ACCOUNT = {
  email: 'api-tester@yaadbooks.com',
  password: 'YaadBooks-API-Test-2026!',
  firstName: 'API',
  lastName: 'Tester',
};

const TEST_COMPANY = {
  businessName: 'YaadBooks Test Company',
  tradingName: 'Test Co',
  trn: 'TEST-000-000',
  industry: 'Technology',
  country: 'JM',
  currency: 'JMD',
};

async function main() {
  console.log('🔧 Setting up test service account...\n');

  // Check if account exists
  let user = await prisma.user.findUnique({
    where: { email: TEST_ACCOUNT.email },
  });

  if (user) {
    console.log('✅ Test account already exists:', TEST_ACCOUNT.email);
  } else {
    // Create password hash
    const passwordHash = await bcrypt.hash(TEST_ACCOUNT.password, 12);

    // Create user
    user = await prisma.user.create({
      data: {
        email: TEST_ACCOUNT.email,
        emailVerified: new Date(),
        passwordHash,
        firstName: TEST_ACCOUNT.firstName,
        lastName: TEST_ACCOUNT.lastName,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });
    console.log('✅ Created test user:', user.id);
  }

  // Check if test company exists
  let company = await prisma.company.findFirst({
    where: { businessName: TEST_COMPANY.businessName },
  });

  if (company) {
    console.log('✅ Test company already exists:', company.id);
  } else {
    // Create test company with full subscription
    company = await prisma.company.create({
      data: {
        businessName: TEST_COMPANY.businessName,
        tradingName: TEST_COMPANY.tradingName,
        trn: TEST_COMPANY.trn,
        industry: TEST_COMPANY.industry,
        country: TEST_COMPANY.country,
        currency: TEST_COMPANY.currency,
        subscriptionTier: SubscriptionTier.ENTERPRISE,
        subscriptionStatus: 'ACTIVE',
        billingEmail: TEST_ACCOUNT.email,
      },
    });
    console.log('✅ Created test company:', company.id);
  }

  // Link user to company as OWNER
  const membership = await prisma.companyMembership.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: company.id,
      },
    },
    update: {
      role: 'OWNER',
    },
    create: {
      userId: user.id,
      companyId: company.id,
      role: 'OWNER',
    },
  });
  console.log('✅ User linked to company as OWNER');

  // Set active company
  await prisma.user.update({
    where: { id: user.id },
    data: { activeCompanyId: company.id },
  });

  console.log('\n' + '='.repeat(60));
  console.log('🎉 TEST ACCOUNT READY');
  console.log('='.repeat(60));
  console.log('\n📧 Email:', TEST_ACCOUNT.email);
  console.log('🔑 Password:', TEST_ACCOUNT.password);
  console.log('🏢 Company ID:', company.id);
  console.log('👤 User ID:', user.id);
  console.log('\n📡 API Login:');
  console.log(`
curl -X POST https://yaadbooks.com/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "${TEST_ACCOUNT.email}", "password": "${TEST_ACCOUNT.password}"}'
`);
  console.log('='.repeat(60));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
