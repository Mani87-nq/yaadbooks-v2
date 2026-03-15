/**
 * Jamaica Payroll Tax Calculator (2024/2025)
 *
 * Calculates all statutory deductions for Jamaica payroll:
 * - PAYE (Pay As You Earn) - Income Tax
 * - NIS (National Insurance Scheme)
 * - NHT (National Housing Trust)
 * - Education Tax
 * - HEART/NTA (Employer only)
 *
 * Reference: Tax Administration Jamaica (TAJ) guidelines
 * Last updated: March 2026 (2024/2025 tax year rates)
 */

// =============================================================================
// TAX CONSTANTS (Jamaica 2024/2025)
// =============================================================================

/**
 * PAYE (Pay As You Earn) Income Tax Brackets
 * 
 * The annual income tax threshold for 2024/2025 is J$1,500,096.
 * - Income up to threshold: 0%
 * - Income from threshold to J$6,000,000: 25%
 * - Income above J$6,000,000: 30%
 */
export const PAYE_CONFIG = {
  /** Annual tax-free threshold (J$1,500,096) */
  ANNUAL_THRESHOLD: 1_500_096,
  
  /** Annual amount where higher rate kicks in (J$6,000,000) */
  HIGHER_RATE_THRESHOLD: 6_000_000,
  
  /** Standard PAYE rate (25%) */
  STANDARD_RATE: 0.25,
  
  /** Higher PAYE rate (30%) */
  HIGHER_RATE: 0.30,
} as const;

/**
 * NIS (National Insurance Scheme) Rates
 * 
 * Both employee and employer contribute 3% of gross earnings.
 * Contributions are subject to maximum ceilings.
 */
export const NIS_CONFIG = {
  /** Employee contribution rate (3%) */
  EMPLOYEE_RATE: 0.03,
  
  /** Employer contribution rate (3%) */
  EMPLOYER_RATE: 0.03,
  
  /** Maximum weekly contribution (J$3,000) */
  MAX_WEEKLY_CONTRIBUTION: 3_000,
  
  /** Maximum bi-weekly contribution (J$6,000) */
  MAX_BIWEEKLY_CONTRIBUTION: 6_000,
  
  /** Maximum monthly contribution (J$13,000) */
  MAX_MONTHLY_CONTRIBUTION: 13_000,
} as const;

/**
 * NHT (National Housing Trust) Rates
 * 
 * Employee contributes 2%, employer contributes 3% of gross earnings.
 * No maximum ceiling applies.
 */
export const NHT_CONFIG = {
  /** Employee contribution rate (2%) */
  EMPLOYEE_RATE: 0.02,
  
  /** Employer contribution rate (3%) */
  EMPLOYER_RATE: 0.03,
} as const;

/**
 * Education Tax Rates
 * 
 * Employee contributes 2.25%, employer contributes 3.5% of gross earnings.
 * No maximum ceiling applies.
 */
export const EDUCATION_TAX_CONFIG = {
  /** Employee contribution rate (2.25%) */
  EMPLOYEE_RATE: 0.0225,
  
  /** Employer contribution rate (3.5%) */
  EMPLOYER_RATE: 0.035,
} as const;

/**
 * HEART/NTA (Human Employment and Resource Training / National Training Agency)
 * 
 * Employer-only contribution of 3% of gross payroll.
 */
export const HEART_CONFIG = {
  /** Employer contribution rate (3%) */
  EMPLOYER_RATE: 0.03,
} as const;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Pay period frequencies supported by the calculator.
 */
export type PayPeriod = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

/**
 * Number of pay periods per year for each frequency.
 */
export const PAY_PERIODS_PER_YEAR: Record<PayPeriod, number> = {
  WEEKLY: 52,
  BIWEEKLY: 26,
  MONTHLY: 12,
};

/**
 * Input parameters for payroll tax calculation.
 */
export interface PayrollTaxInput {
  /** Gross salary for the pay period (JMD) */
  grossSalary: number;
  
  /** Pay period frequency */
  payPeriod: PayPeriod;
  
  /**
   * Year-to-date gross earnings BEFORE this pay period.
   * Used for accurate PAYE calculation when employee crosses tax brackets.
   * If not provided, assumes first pay period of the year.
   */
  ytdGrossEarnings?: number;
  
  /**
   * Year-to-date PAYE paid BEFORE this pay period.
   * Used to ensure cumulative PAYE is correct.
   */
  ytdPayePaid?: number;
}

/**
 * Result of payroll tax calculation.
 */
export interface PayrollTaxResult {
  // --- Gross ---
  grossSalary: number;
  
  // --- Employee Deductions ---
  paye: number;
  nis: number;
  nht: number;
  educationTax: number;
  totalDeductions: number;
  
  // --- Net Pay ---
  netPay: number;
  
  // --- Employer Contributions ---
  employerNis: number;
  employerNht: number;
  employerEducationTax: number;
  heartContribution: number;
  totalEmployerContributions: number;
  
  // --- Breakdown for transparency ---
  breakdown: {
    payPeriod: PayPeriod;
    periodsPerYear: number;
    annualisedGross: number;
    annualisedPaye: number;
    nisMaxApplied: boolean;
    taxBand: 'EXEMPT' | 'STANDARD' | 'HIGHER' | 'MIXED';
  };
}

/**
 * Detailed PAYE calculation result.
 */
export interface PAYECalculation {
  /** PAYE due for this period */
  periodPaye: number;
  
  /** Annualised gross salary */
  annualisedGross: number;
  
  /** Annualised PAYE */
  annualisedPaye: number;
  
  /** Tax band applied */
  taxBand: 'EXEMPT' | 'STANDARD' | 'HIGHER' | 'MIXED';
  
  /** YTD PAYE after this period */
  ytdPayeAfter: number;
}

// =============================================================================
// CORE CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate all payroll taxes for a given gross salary and pay period.
 * 
 * This is the main entry point for payroll tax calculation.
 * 
 * @example
 * ```typescript
 * const result = calculatePayrollTaxes({
 *   grossSalary: 150000,  // J$150,000 monthly
 *   payPeriod: 'MONTHLY',
 * });
 * 
 * console.log(result.paye);      // PAYE deduction
 * console.log(result.netPay);    // Take-home pay
 * ```
 */
export function calculatePayrollTaxes(input: PayrollTaxInput): PayrollTaxResult {
  const { grossSalary, payPeriod, ytdGrossEarnings = 0, ytdPayePaid = 0 } = input;
  
  // Validate input
  if (grossSalary < 0) {
    throw new Error('Gross salary cannot be negative');
  }
  
  const periodsPerYear = PAY_PERIODS_PER_YEAR[payPeriod];
  
  // --- Calculate PAYE (Income Tax) ---
  const payeResult = calculatePAYE(grossSalary, payPeriod, ytdGrossEarnings, ytdPayePaid);
  const paye = payeResult.periodPaye;
  
  // --- Calculate NIS (Employee) ---
  const nisResult = calculateNIS(grossSalary, payPeriod);
  const nis = nisResult.employeeContribution;
  const employerNis = nisResult.employerContribution;
  
  // --- Calculate NHT (Employee) ---
  const nht = calculateNHT(grossSalary, 'EMPLOYEE');
  const employerNht = calculateNHT(grossSalary, 'EMPLOYER');
  
  // --- Calculate Education Tax (Employee) ---
  const educationTax = calculateEducationTax(grossSalary, 'EMPLOYEE');
  const employerEducationTax = calculateEducationTax(grossSalary, 'EMPLOYER');
  
  // --- Calculate HEART (Employer only) ---
  const heartContribution = calculateHEART(grossSalary);
  
  // --- Totals ---
  const totalDeductions = round2(paye + nis + nht + educationTax);
  const netPay = round2(grossSalary - totalDeductions);
  const totalEmployerContributions = round2(
    employerNis + employerNht + employerEducationTax + heartContribution
  );
  
  return {
    grossSalary: round2(grossSalary),
    
    paye: round2(paye),
    nis: round2(nis),
    nht: round2(nht),
    educationTax: round2(educationTax),
    totalDeductions,
    
    netPay,
    
    employerNis: round2(employerNis),
    employerNht: round2(employerNht),
    employerEducationTax: round2(employerEducationTax),
    heartContribution: round2(heartContribution),
    totalEmployerContributions,
    
    breakdown: {
      payPeriod,
      periodsPerYear,
      annualisedGross: payeResult.annualisedGross,
      annualisedPaye: payeResult.annualisedPaye,
      nisMaxApplied: nisResult.maxApplied,
      taxBand: payeResult.taxBand,
    },
  };
}

/**
 * Calculate PAYE (Pay As You Earn) income tax.
 * 
 * Uses the cumulative method for accuracy:
 * 1. Annualise gross salary
 * 2. Calculate annual tax
 * 3. Pro-rate to pay period
 * 
 * For mid-year employees or those who've crossed brackets, uses YTD figures.
 */
export function calculatePAYE(
  grossSalary: number,
  payPeriod: PayPeriod,
  ytdGrossEarnings: number = 0,
  ytdPayePaid: number = 0
): PAYECalculation {
  const periodsPerYear = PAY_PERIODS_PER_YEAR[payPeriod];
  
  // --- Cumulative Method ---
  // Calculate what the YTD gross will be AFTER this pay period
  const ytdGrossAfter = ytdGrossEarnings + grossSalary;
  
  // Determine what period we're in (1-based)
  const currentPeriod = Math.round(ytdGrossEarnings / grossSalary) + 1 || 1;
  const cappedPeriod = Math.min(currentPeriod, periodsPerYear);
  
  // Calculate proportionate threshold and brackets for YTD
  const proportionateThreshold = (PAYE_CONFIG.ANNUAL_THRESHOLD / periodsPerYear) * cappedPeriod;
  const proportionateHigherThreshold = (PAYE_CONFIG.HIGHER_RATE_THRESHOLD / periodsPerYear) * cappedPeriod;
  
  // Calculate cumulative PAYE due
  let cumulativePayeDue = 0;
  let taxBand: PAYECalculation['taxBand'] = 'EXEMPT';
  
  if (ytdGrossAfter <= proportionateThreshold) {
    // All income is within tax-free threshold
    cumulativePayeDue = 0;
    taxBand = 'EXEMPT';
  } else if (ytdGrossAfter <= proportionateHigherThreshold) {
    // Income is within the standard (25%) band
    const taxableIncome = ytdGrossAfter - proportionateThreshold;
    cumulativePayeDue = taxableIncome * PAYE_CONFIG.STANDARD_RATE;
    taxBand = 'STANDARD';
  } else {
    // Income crosses into the higher (30%) band
    const standardBandIncome = proportionateHigherThreshold - proportionateThreshold;
    const higherBandIncome = ytdGrossAfter - proportionateHigherThreshold;
    
    cumulativePayeDue = (standardBandIncome * PAYE_CONFIG.STANDARD_RATE) + 
                        (higherBandIncome * PAYE_CONFIG.HIGHER_RATE);
    taxBand = ytdGrossEarnings < proportionateHigherThreshold ? 'MIXED' : 'HIGHER';
  }
  
  // PAYE for this period = cumulative due - already paid
  const periodPaye = Math.max(0, cumulativePayeDue - ytdPayePaid);
  
  // Calculate annualised figures for reference
  const annualisedGross = grossSalary * periodsPerYear;
  const annualisedPaye = calculateAnnualPAYE(annualisedGross);
  
  return {
    periodPaye: round2(periodPaye),
    annualisedGross: round2(annualisedGross),
    annualisedPaye: round2(annualisedPaye),
    taxBand,
    ytdPayeAfter: round2(cumulativePayeDue),
  };
}

/**
 * Calculate annual PAYE for a given annual gross income.
 * Useful for salary projections and verification.
 */
export function calculateAnnualPAYE(annualGross: number): number {
  if (annualGross <= PAYE_CONFIG.ANNUAL_THRESHOLD) {
    return 0;
  }
  
  if (annualGross <= PAYE_CONFIG.HIGHER_RATE_THRESHOLD) {
    // Standard rate on amount above threshold
    return (annualGross - PAYE_CONFIG.ANNUAL_THRESHOLD) * PAYE_CONFIG.STANDARD_RATE;
  }
  
  // Standard rate on first band + Higher rate on remainder
  const standardBandTax = (PAYE_CONFIG.HIGHER_RATE_THRESHOLD - PAYE_CONFIG.ANNUAL_THRESHOLD) * PAYE_CONFIG.STANDARD_RATE;
  const higherBandTax = (annualGross - PAYE_CONFIG.HIGHER_RATE_THRESHOLD) * PAYE_CONFIG.HIGHER_RATE;
  
  return standardBandTax + higherBandTax;
}

/**
 * Calculate NIS (National Insurance Scheme) contributions.
 * Both employee and employer contribute 3%, subject to maximum ceilings.
 */
export function calculateNIS(
  grossSalary: number,
  payPeriod: PayPeriod
): { employeeContribution: number; employerContribution: number; maxApplied: boolean } {
  // Calculate raw contributions
  const rawEmployee = grossSalary * NIS_CONFIG.EMPLOYEE_RATE;
  const rawEmployer = grossSalary * NIS_CONFIG.EMPLOYER_RATE;
  
  // Get the maximum for this pay period
  let maxContribution: number;
  switch (payPeriod) {
    case 'WEEKLY':
      maxContribution = NIS_CONFIG.MAX_WEEKLY_CONTRIBUTION;
      break;
    case 'BIWEEKLY':
      maxContribution = NIS_CONFIG.MAX_BIWEEKLY_CONTRIBUTION;
      break;
    case 'MONTHLY':
      maxContribution = NIS_CONFIG.MAX_MONTHLY_CONTRIBUTION;
      break;
  }
  
  // Apply maximum
  const employeeContribution = Math.min(rawEmployee, maxContribution);
  const employerContribution = Math.min(rawEmployer, maxContribution);
  const maxApplied = rawEmployee > maxContribution || rawEmployer > maxContribution;
  
  return {
    employeeContribution: round2(employeeContribution),
    employerContribution: round2(employerContribution),
    maxApplied,
  };
}

/**
 * Calculate NHT (National Housing Trust) contribution.
 * Employee: 2%, Employer: 3%. No maximum ceiling.
 */
export function calculateNHT(
  grossSalary: number,
  type: 'EMPLOYEE' | 'EMPLOYER'
): number {
  const rate = type === 'EMPLOYEE' ? NHT_CONFIG.EMPLOYEE_RATE : NHT_CONFIG.EMPLOYER_RATE;
  return round2(grossSalary * rate);
}

/**
 * Calculate Education Tax contribution.
 * Employee: 2.25%, Employer: 3.5%. No maximum ceiling.
 */
export function calculateEducationTax(
  grossSalary: number,
  type: 'EMPLOYEE' | 'EMPLOYER'
): number {
  const rate = type === 'EMPLOYEE' ? EDUCATION_TAX_CONFIG.EMPLOYEE_RATE : EDUCATION_TAX_CONFIG.EMPLOYER_RATE;
  return round2(grossSalary * rate);
}

/**
 * Calculate HEART/NTA contribution (Employer only).
 * 3% of gross payroll.
 */
export function calculateHEART(grossSalary: number): number {
  return round2(grossSalary * HEART_CONFIG.EMPLOYER_RATE);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert pay period amounts between frequencies.
 * Useful for salary comparisons and projections.
 */
export function convertPayPeriod(
  amount: number,
  fromPeriod: PayPeriod,
  toPeriod: PayPeriod
): number {
  const annualAmount = amount * PAY_PERIODS_PER_YEAR[fromPeriod];
  return round2(annualAmount / PAY_PERIODS_PER_YEAR[toPeriod]);
}

/**
 * Get the tax-free threshold for a specific pay period.
 */
export function getPayPeriodThreshold(payPeriod: PayPeriod): number {
  return round2(PAYE_CONFIG.ANNUAL_THRESHOLD / PAY_PERIODS_PER_YEAR[payPeriod]);
}

/**
 * Calculate effective tax rate (total deductions / gross salary).
 */
export function calculateEffectiveTaxRate(result: PayrollTaxResult): number {
  if (result.grossSalary === 0) return 0;
  return round2((result.totalDeductions / result.grossSalary) * 100) / 100;
}

/**
 * Validate that a salary meets Jamaica minimum wage requirements.
 * 
 * As of 2024, minimum wage is J$16,000 per 40-hour week (J$400/hour).
 * Monthly equivalent: approximately J$69,333.
 */
export function validateMinimumWage(
  grossSalary: number,
  payPeriod: PayPeriod
): { isValid: boolean; minimumRequired: number } {
  const MINIMUM_WEEKLY = 16_000;
  
  let minimumRequired: number;
  switch (payPeriod) {
    case 'WEEKLY':
      minimumRequired = MINIMUM_WEEKLY;
      break;
    case 'BIWEEKLY':
      minimumRequired = MINIMUM_WEEKLY * 2;
      break;
    case 'MONTHLY':
      minimumRequired = Math.round((MINIMUM_WEEKLY * 52) / 12);
      break;
  }
  
  return {
    isValid: grossSalary >= minimumRequired,
    minimumRequired,
  };
}

/**
 * Generate a summary suitable for display in the UI.
 */
export function generateTaxSummary(result: PayrollTaxResult): string {
  const lines = [
    `Gross Salary: J$${formatCurrency(result.grossSalary)}`,
    '',
    'Employee Deductions:',
    `  PAYE (Income Tax): J$${formatCurrency(result.paye)}`,
    `  NIS: J$${formatCurrency(result.nis)}`,
    `  NHT: J$${formatCurrency(result.nht)}`,
    `  Education Tax: J$${formatCurrency(result.educationTax)}`,
    `  Total Deductions: J$${formatCurrency(result.totalDeductions)}`,
    '',
    `NET PAY: J$${formatCurrency(result.netPay)}`,
    '',
    'Employer Contributions:',
    `  Employer NIS: J$${formatCurrency(result.employerNis)}`,
    `  Employer NHT: J$${formatCurrency(result.employerNht)}`,
    `  Employer Education Tax: J$${formatCurrency(result.employerEducationTax)}`,
    `  HEART/NTA: J$${formatCurrency(result.heartContribution)}`,
    `  Total Employer: J$${formatCurrency(result.totalEmployerContributions)}`,
  ];
  
  return lines.join('\n');
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Round to 2 decimal places.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Format currency for display.
 */
function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-JM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
