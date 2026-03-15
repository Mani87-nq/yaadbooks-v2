/**
 * Prisma Seed Script - YaadBooks
 *
 * Populates the database with:
 * 1. Default chart of accounts (Jamaica standard - 30+ core accounts)
 * 2. Default GCT (General Consumption Tax) rates
 * 3. Jamaica parishes (all 14)
 * 4. Approximate currency exchange rates (foreign -> JMD)
 *
 * Run with: npx prisma db seed
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL ?? 'postgresql://dolphy@localhost:5432/yaadbooks?schema=public';
const pool = new pg.Pool({ connectionString });
// Cast to unknown first to satisfy @prisma/adapter-pg's bundled @types/pg version
const adapter = new PrismaPg(pool as unknown as ConstructorParameters<typeof PrismaPg>[0]);
const prisma = new PrismaClient({ adapter });

// ─── Chart of Accounts (Jamaica Standard) ──────────────────────────

interface SeedAccount {
  accountNumber: string;
  code: string;
  name: string;
  fullName: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  subType?: 'CURRENT' | 'NON_CURRENT' | 'COGS' | 'OPERATING' | 'OTHER';
  normalBalance: 'debit' | 'credit';
  isSystemAccount: boolean;
  isControlAccount?: boolean;
  isTaxAccount?: boolean;
  isBankAccount?: boolean;
  gctClaimable?: boolean;
  description?: string;
}

const DEFAULT_ACCOUNTS: SeedAccount[] = [
  // ── ASSETS (1000-1999) ──────────────────────────────────────────
  {
    accountNumber: '1000',
    code: 'CASH',
    name: 'Cash on Hand',
    fullName: 'Assets > Current Assets > Cash on Hand',
    type: 'ASSET',
    subType: 'CURRENT',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: 'Physical cash held by the business',
  },
  {
    accountNumber: '1010',
    code: 'BANK-CHQ',
    name: 'Bank - Chequing Account',
    fullName: 'Assets > Current Assets > Bank - Chequing Account',
    type: 'ASSET',
    subType: 'CURRENT',
    normalBalance: 'debit',
    isSystemAccount: true,
    isBankAccount: true,
    description: 'Primary business chequing account',
  },
  {
    accountNumber: '1020',
    code: 'BANK-SAV',
    name: 'Bank - Savings Account',
    fullName: 'Assets > Current Assets > Bank - Savings Account',
    type: 'ASSET',
    subType: 'CURRENT',
    normalBalance: 'debit',
    isSystemAccount: true,
    isBankAccount: true,
    description: 'Business savings account',
  },
  {
    accountNumber: '1050',
    code: 'PETTY',
    name: 'Petty Cash',
    fullName: 'Assets > Current Assets > Petty Cash',
    type: 'ASSET',
    subType: 'CURRENT',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: 'Petty cash fund for small expenses',
  },
  {
    accountNumber: '1100',
    code: 'AR',
    name: 'Accounts Receivable',
    fullName: 'Assets > Current Assets > Accounts Receivable',
    type: 'ASSET',
    subType: 'CURRENT',
    normalBalance: 'debit',
    isSystemAccount: true,
    isControlAccount: true,
    description: 'Amounts owed by customers',
  },
  {
    accountNumber: '1150',
    code: 'ALLOW-DD',
    name: 'Allowance for Doubtful Debts',
    fullName: 'Assets > Current Assets > Allowance for Doubtful Debts',
    type: 'ASSET',
    subType: 'CURRENT',
    normalBalance: 'credit',
    isSystemAccount: true,
    description: 'Contra-asset for estimated uncollectible receivables',
  },
  {
    accountNumber: '1200',
    code: 'INV',
    name: 'Inventory',
    fullName: 'Assets > Current Assets > Inventory',
    type: 'ASSET',
    subType: 'CURRENT',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: 'Goods held for resale',
  },
  {
    accountNumber: '1300',
    code: 'PREPAID',
    name: 'Prepaid Expenses',
    fullName: 'Assets > Current Assets > Prepaid Expenses',
    type: 'ASSET',
    subType: 'CURRENT',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: 'Expenses paid in advance (e.g. insurance, rent)',
  },
  {
    accountNumber: '1350',
    code: 'GCT-INPUT',
    name: 'GCT Input Tax Receivable',
    fullName: 'Assets > Current Assets > GCT Input Tax Receivable',
    type: 'ASSET',
    subType: 'CURRENT',
    normalBalance: 'debit',
    isSystemAccount: true,
    isTaxAccount: true,
    gctClaimable: true,
    description: 'GCT paid on purchases claimable from TAJ',
  },
  {
    accountNumber: '1400',
    code: 'DEPOSIT',
    name: 'Deposits & Advances',
    fullName: 'Assets > Current Assets > Deposits & Advances',
    type: 'ASSET',
    subType: 'CURRENT',
    normalBalance: 'debit',
    isSystemAccount: false,
    description: 'Security deposits and advance payments',
  },
  {
    accountNumber: '1500',
    code: 'EQUIP',
    name: 'Equipment',
    fullName: 'Assets > Non-Current Assets > Equipment',
    type: 'ASSET',
    subType: 'NON_CURRENT',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: 'Office equipment, machinery, computers',
  },
  {
    accountNumber: '1510',
    code: 'FURN',
    name: 'Furniture & Fixtures',
    fullName: 'Assets > Non-Current Assets > Furniture & Fixtures',
    type: 'ASSET',
    subType: 'NON_CURRENT',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: 'Office furniture and fixtures',
  },
  {
    accountNumber: '1520',
    code: 'VEHICLE',
    name: 'Motor Vehicles',
    fullName: 'Assets > Non-Current Assets > Motor Vehicles',
    type: 'ASSET',
    subType: 'NON_CURRENT',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: 'Business vehicles',
  },
  {
    accountNumber: '1600',
    code: 'ACCUM-DEP',
    name: 'Accumulated Depreciation',
    fullName: 'Assets > Non-Current Assets > Accumulated Depreciation',
    type: 'ASSET',
    subType: 'NON_CURRENT',
    normalBalance: 'credit',
    isSystemAccount: true,
    description: 'Contra-asset for total depreciation on fixed assets',
  },

  // ── LIABILITIES (2000-2999) ─────────────────────────────────────
  {
    accountNumber: '2000',
    code: 'AP',
    name: 'Accounts Payable',
    fullName: 'Liabilities > Current Liabilities > Accounts Payable',
    type: 'LIABILITY',
    subType: 'CURRENT',
    normalBalance: 'credit',
    isSystemAccount: true,
    isControlAccount: true,
    description: 'Amounts owed to suppliers and vendors',
  },
  {
    accountNumber: '2100',
    code: 'GCT-PAY',
    name: 'GCT Payable',
    fullName: 'Liabilities > Current Liabilities > GCT Payable',
    type: 'LIABILITY',
    subType: 'CURRENT',
    normalBalance: 'credit',
    isSystemAccount: true,
    isTaxAccount: true,
    description: 'GCT collected on sales, owed to TAJ',
  },
  {
    accountNumber: '2110',
    code: 'PAYE-PAY',
    name: 'PAYE Payable',
    fullName: 'Liabilities > Current Liabilities > PAYE Payable',
    type: 'LIABILITY',
    subType: 'CURRENT',
    normalBalance: 'credit',
    isSystemAccount: true,
    isTaxAccount: true,
    description: 'Pay-As-You-Earn income tax withheld from employees',
  },
  {
    accountNumber: '2120',
    code: 'NIS-PAY',
    name: 'NIS Payable',
    fullName: 'Liabilities > Current Liabilities > NIS Payable',
    type: 'LIABILITY',
    subType: 'CURRENT',
    normalBalance: 'credit',
    isSystemAccount: true,
    isTaxAccount: true,
    description: 'National Insurance Scheme contributions payable',
  },
  {
    accountNumber: '2130',
    code: 'NHT-PAY',
    name: 'NHT Payable',
    fullName: 'Liabilities > Current Liabilities > NHT Payable',
    type: 'LIABILITY',
    subType: 'CURRENT',
    normalBalance: 'credit',
    isSystemAccount: true,
    isTaxAccount: true,
    description: 'National Housing Trust contributions payable',
  },
  {
    accountNumber: '2140',
    code: 'EDTAX-PAY',
    name: 'Education Tax Payable',
    fullName: 'Liabilities > Current Liabilities > Education Tax Payable',
    type: 'LIABILITY',
    subType: 'CURRENT',
    normalBalance: 'credit',
    isSystemAccount: true,
    isTaxAccount: true,
    description: 'Education tax deductions payable',
  },
  {
    accountNumber: '2150',
    code: 'HEART-PAY',
    name: 'HEART/NTA Payable',
    fullName: 'Liabilities > Current Liabilities > HEART/NTA Payable',
    type: 'LIABILITY',
    subType: 'CURRENT',
    normalBalance: 'credit',
    isSystemAccount: true,
    isTaxAccount: true,
    description: 'HEART/NTA employer contribution payable',
  },
  {
    accountNumber: '2200',
    code: 'ACCR-EXP',
    name: 'Accrued Expenses',
    fullName: 'Liabilities > Current Liabilities > Accrued Expenses',
    type: 'LIABILITY',
    subType: 'CURRENT',
    normalBalance: 'credit',
    isSystemAccount: false,
    description: 'Expenses incurred but not yet paid',
  },
  {
    accountNumber: '2300',
    code: 'WHT-PAY',
    name: 'Withholding Tax Payable',
    fullName: 'Liabilities > Current Liabilities > Withholding Tax Payable',
    type: 'LIABILITY',
    subType: 'CURRENT',
    normalBalance: 'credit',
    isSystemAccount: true,
    isTaxAccount: true,
    description: 'Withholding tax on vendor payments owed to TAJ',
  },
  {
    accountNumber: '2500',
    code: 'LOAN-ST',
    name: 'Short-Term Loans',
    fullName: 'Liabilities > Current Liabilities > Short-Term Loans',
    type: 'LIABILITY',
    subType: 'CURRENT',
    normalBalance: 'credit',
    isSystemAccount: false,
    description: 'Bank loans due within one year',
  },
  {
    accountNumber: '2700',
    code: 'LOAN-LT',
    name: 'Long-Term Loans',
    fullName: 'Liabilities > Non-Current Liabilities > Long-Term Loans',
    type: 'LIABILITY',
    subType: 'NON_CURRENT',
    normalBalance: 'credit',
    isSystemAccount: false,
    description: 'Bank loans and mortgages due after one year',
  },

  // ── EQUITY (3000-3999) ──────────────────────────────────────────
  {
    accountNumber: '3000',
    code: 'CAPITAL',
    name: "Owner's Capital",
    fullName: "Equity > Owner's Capital",
    type: 'EQUITY',
    normalBalance: 'credit',
    isSystemAccount: true,
    description: "Owner's investment in the business",
  },
  {
    accountNumber: '3100',
    code: 'DRAWINGS',
    name: "Owner's Drawings",
    fullName: "Equity > Owner's Drawings",
    type: 'EQUITY',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: "Owner's personal withdrawals from the business",
  },
  {
    accountNumber: '3200',
    code: 'RET-EARN',
    name: 'Retained Earnings',
    fullName: 'Equity > Retained Earnings',
    type: 'EQUITY',
    normalBalance: 'credit',
    isSystemAccount: true,
    description: 'Accumulated net profit retained in the business',
  },

  // ── REVENUE (4000-4999) ─────────────────────────────────────────
  {
    accountNumber: '4000',
    code: 'SALES',
    name: 'Sales Revenue',
    fullName: 'Revenue > Sales Revenue',
    type: 'INCOME',
    normalBalance: 'credit',
    isSystemAccount: true,
    description: 'Revenue from sale of goods',
  },
  {
    accountNumber: '4100',
    code: 'SVC-REV',
    name: 'Service Revenue',
    fullName: 'Revenue > Service Revenue',
    type: 'INCOME',
    normalBalance: 'credit',
    isSystemAccount: true,
    description: 'Revenue from services rendered',
  },
  {
    accountNumber: '4200',
    code: 'INT-INC',
    name: 'Interest Income',
    fullName: 'Revenue > Interest Income',
    type: 'INCOME',
    subType: 'OTHER',
    normalBalance: 'credit',
    isSystemAccount: true,
    description: 'Interest earned on bank deposits and loans',
  },
  {
    accountNumber: '4300',
    code: 'DISC-REC',
    name: 'Discounts Received',
    fullName: 'Revenue > Discounts Received',
    type: 'INCOME',
    subType: 'OTHER',
    normalBalance: 'credit',
    isSystemAccount: false,
    description: 'Settlement discounts received from suppliers',
  },
  {
    accountNumber: '4400',
    code: 'FX-GAIN',
    name: 'Foreign Exchange Gains',
    fullName: 'Revenue > Foreign Exchange Gains',
    type: 'INCOME',
    subType: 'OTHER',
    normalBalance: 'credit',
    isSystemAccount: true,
    description: 'Gains from foreign currency transactions and revaluations',
  },
  {
    accountNumber: '4900',
    code: 'OTH-INC',
    name: 'Other Income',
    fullName: 'Revenue > Other Income',
    type: 'INCOME',
    subType: 'OTHER',
    normalBalance: 'credit',
    isSystemAccount: false,
    description: 'Miscellaneous income not classified elsewhere',
  },

  // ── EXPENSES (5000-5999) ────────────────────────────────────────
  {
    accountNumber: '5000',
    code: 'COGS',
    name: 'Cost of Goods Sold',
    fullName: 'Expenses > Cost of Goods Sold',
    type: 'EXPENSE',
    subType: 'COGS',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: 'Direct cost of goods sold to customers',
  },
  {
    accountNumber: '5100',
    code: 'SALARY',
    name: 'Salaries & Wages',
    fullName: 'Expenses > Operating Expenses > Salaries & Wages',
    type: 'EXPENSE',
    subType: 'OPERATING',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: 'Employee salaries and wages',
  },
  {
    accountNumber: '5110',
    code: 'EMP-STAT',
    name: 'Employer Statutory Contributions',
    fullName: 'Expenses > Operating Expenses > Employer Statutory Contributions',
    type: 'EXPENSE',
    subType: 'OPERATING',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: 'Employer NIS, NHT, Education Tax, HEART/NTA contributions',
  },
  {
    accountNumber: '5200',
    code: 'RENT',
    name: 'Rent Expense',
    fullName: 'Expenses > Operating Expenses > Rent Expense',
    type: 'EXPENSE',
    subType: 'OPERATING',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: 'Office and warehouse rent',
  },
  {
    accountNumber: '5300',
    code: 'UTILITIES',
    name: 'Utilities',
    fullName: 'Expenses > Operating Expenses > Utilities',
    type: 'EXPENSE',
    subType: 'OPERATING',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: 'Electricity (JPS), water (NWC), internet',
  },
  {
    accountNumber: '5400',
    code: 'DEPREC',
    name: 'Depreciation Expense',
    fullName: 'Expenses > Operating Expenses > Depreciation Expense',
    type: 'EXPENSE',
    subType: 'OPERATING',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: 'Periodic depreciation of fixed assets',
  },
  {
    accountNumber: '5500',
    code: 'INSURANCE',
    name: 'Insurance Expense',
    fullName: 'Expenses > Operating Expenses > Insurance Expense',
    type: 'EXPENSE',
    subType: 'OPERATING',
    normalBalance: 'debit',
    isSystemAccount: false,
    description: 'Business insurance premiums',
  },
  {
    accountNumber: '5600',
    code: 'PROF-FEE',
    name: 'Professional Fees',
    fullName: 'Expenses > Operating Expenses > Professional Fees',
    type: 'EXPENSE',
    subType: 'OPERATING',
    normalBalance: 'debit',
    isSystemAccount: false,
    description: 'Legal, accounting, and consulting fees',
  },
  {
    accountNumber: '5700',
    code: 'BANK-FEE',
    name: 'Bank Charges & Fees',
    fullName: 'Expenses > Operating Expenses > Bank Charges & Fees',
    type: 'EXPENSE',
    subType: 'OPERATING',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: 'Bank service charges, transaction fees',
  },
  {
    accountNumber: '5750',
    code: 'DISC-GIV',
    name: 'Discounts Given',
    fullName: 'Expenses > Operating Expenses > Discounts Given',
    type: 'EXPENSE',
    subType: 'OPERATING',
    normalBalance: 'debit',
    isSystemAccount: false,
    description: 'Settlement discounts given to customers',
  },
  {
    accountNumber: '5800',
    code: 'TRAVEL',
    name: 'Travel & Transportation',
    fullName: 'Expenses > Operating Expenses > Travel & Transportation',
    type: 'EXPENSE',
    subType: 'OPERATING',
    normalBalance: 'debit',
    isSystemAccount: false,
    description: 'Business travel, fuel, transportation expenses',
  },
  {
    accountNumber: '5850',
    code: 'ADVERTISE',
    name: 'Advertising & Marketing',
    fullName: 'Expenses > Operating Expenses > Advertising & Marketing',
    type: 'EXPENSE',
    subType: 'OPERATING',
    normalBalance: 'debit',
    isSystemAccount: false,
    description: 'Marketing campaigns, advertising costs',
  },
  {
    accountNumber: '5900',
    code: 'FX-LOSS',
    name: 'Foreign Exchange Losses',
    fullName: 'Expenses > Other Expenses > Foreign Exchange Losses',
    type: 'EXPENSE',
    subType: 'OTHER',
    normalBalance: 'debit',
    isSystemAccount: true,
    description: 'Losses from foreign currency transactions and revaluations',
  },
  {
    accountNumber: '5950',
    code: 'BAD-DEBT',
    name: 'Bad Debt Expense',
    fullName: 'Expenses > Other Expenses > Bad Debt Expense',
    type: 'EXPENSE',
    subType: 'OTHER',
    normalBalance: 'debit',
    isSystemAccount: false,
    description: 'Uncollectible customer accounts written off',
  },
  {
    accountNumber: '5990',
    code: 'OTH-EXP',
    name: 'Other Expenses',
    fullName: 'Expenses > Other Expenses > Other Expenses',
    type: 'EXPENSE',
    subType: 'OTHER',
    normalBalance: 'debit',
    isSystemAccount: false,
    description: 'Miscellaneous expenses not classified elsewhere',
  },
];

// ─── GCT Rate Reference Data ──────────────────────────────────────

const GCT_RATES = [
  { name: 'Standard Rate', rate: 15.0, code: 'STANDARD', description: 'Standard GCT rate on most goods and services' },
  { name: 'Telecommunications Rate', rate: 25.0, code: 'TELECOM', description: 'GCT on telecommunications services' },
  { name: 'Tourism Rate', rate: 10.0, code: 'TOURISM', description: 'GCT on tourism accommodations and attractions' },
  { name: 'Zero Rated', rate: 0.0, code: 'ZERO_RATED', description: 'Taxable at 0% - basic food items, exports' },
  { name: 'Exempt', rate: 0.0, code: 'EXEMPT', description: 'Not subject to GCT - education, health, financial services' },
];

// ─── Jamaica Parishes ─────────────────────────────────────────────

const JAMAICA_PARISHES = [
  { code: 'KINGSTON', name: 'Kingston', capital: 'Kingston' },
  { code: 'ST_ANDREW', name: 'St Andrew', capital: 'Half Way Tree' },
  { code: 'ST_THOMAS', name: 'St Thomas', capital: 'Morant Bay' },
  { code: 'PORTLAND', name: 'Portland', capital: 'Port Antonio' },
  { code: 'ST_MARY', name: 'St Mary', capital: 'Port Maria' },
  { code: 'ST_ANN', name: 'St Ann', capital: "St Ann's Bay" },
  { code: 'TRELAWNY', name: 'Trelawny', capital: 'Falmouth' },
  { code: 'ST_JAMES', name: 'St James', capital: 'Montego Bay' },
  { code: 'HANOVER', name: 'Hanover', capital: 'Lucea' },
  { code: 'WESTMORELAND', name: 'Westmoreland', capital: 'Savanna-la-Mar' },
  { code: 'ST_ELIZABETH', name: 'St Elizabeth', capital: 'Black River' },
  { code: 'MANCHESTER', name: 'Manchester', capital: 'Mandeville' },
  { code: 'CLARENDON', name: 'Clarendon', capital: 'May Pen' },
  { code: 'ST_CATHERINE', name: 'St Catherine', capital: 'Spanish Town' },
];

// ─── Currency Exchange Rates ──────────────────────────────────────
// Approximate rates: 1 foreign unit = X JMD

interface SeedExchangeRate {
  fromCurrency: 'USD' | 'GBP' | 'EUR' | 'CAD' | 'TTD' | 'BBD';
  toCurrency: 'JMD';
  rate: number;
}

const EXCHANGE_RATES: SeedExchangeRate[] = [
  { fromCurrency: 'USD', toCurrency: 'JMD', rate: 154.0 },
  { fromCurrency: 'GBP', toCurrency: 'JMD', rate: 195.0 },
  { fromCurrency: 'EUR', toCurrency: 'JMD', rate: 167.0 },
  { fromCurrency: 'CAD', toCurrency: 'JMD', rate: 110.0 },
  { fromCurrency: 'TTD', toCurrency: 'JMD', rate: 22.7 },
  { fromCurrency: 'BBD', toCurrency: 'JMD', rate: 77.0 },
];

// ─── Seed Functions ───────────────────────────────────────────────

async function seedChartOfAccounts() {
  console.log('Seeding default chart of accounts...');

  let created = 0;
  let skipped = 0;

  for (const account of DEFAULT_ACCOUNTS) {
    // System-level accounts have companyId = null.
    // The unique constraint is @@unique([companyId, accountNumber]),
    // so we upsert based on (null, accountNumber).
    const existing = await prisma.gLAccount.findFirst({
      where: {
        companyId: null,
        accountNumber: account.accountNumber,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.gLAccount.create({
      data: {
        companyId: null,
        accountNumber: account.accountNumber,
        code: account.code,
        name: account.name,
        fullName: account.fullName,
        type: account.type,
        subType: account.subType ?? null,
        normalBalance: account.normalBalance,
        isSystemAccount: account.isSystemAccount,
        isControlAccount: account.isControlAccount ?? false,
        isTaxAccount: account.isTaxAccount ?? false,
        isBankAccount: account.isBankAccount ?? false,
        gctClaimable: account.gctClaimable ?? false,
        description: account.description ?? null,
        isActive: true,
      },
    });
    created++;
  }

  console.log(`  Chart of accounts: ${created} created, ${skipped} already existed`);
}

async function seedExchangeRates() {
  console.log('Seeding exchange rates...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let created = 0;
  let skipped = 0;

  for (const er of EXCHANGE_RATES) {
    const existing = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: er.fromCurrency,
        toCurrency: er.toCurrency,
        rateDate: today,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const inverseRate = 1 / er.rate;

    await prisma.exchangeRate.create({
      data: {
        fromCurrency: er.fromCurrency,
        toCurrency: er.toCurrency,
        rate: er.rate,
        inverseRate: parseFloat(inverseRate.toFixed(6)),
        rateDate: today,
        source: 'SEED',
        isManualOverride: false,
      },
    });
    created++;
  }

  console.log(`  Exchange rates: ${created} created, ${skipped} already existed`);
}

function logGCTRates() {
  console.log('GCT Rate Reference (defined as Prisma enum GCTRate):');
  for (const gct of GCT_RATES) {
    console.log(`  ${gct.code}: ${gct.rate}% - ${gct.description}`);
  }
}

function logParishes() {
  console.log('Jamaica Parishes (defined as Prisma enum JamaicanParish):');
  for (const parish of JAMAICA_PARISHES) {
    console.log(`  ${parish.code}: ${parish.name} (Capital: ${parish.capital})`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('========================================');
  console.log('  YaadBooks Database Seed');
  console.log('========================================');
  console.log('');

  await seedChartOfAccounts();
  await seedExchangeRates();

  console.log('');
  logGCTRates();
  console.log('');
  logParishes();

  console.log('');
  console.log('========================================');
  console.log('  Seed complete!');
  console.log('========================================');
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
