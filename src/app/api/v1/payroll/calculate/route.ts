/**
 * POST /api/v1/payroll/calculate
 *
 * Preview payroll tax calculations without creating a payroll run.
 * Useful for salary negotiation, planning, and what-if scenarios.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { badRequest, internalError } from '@/lib/api-error';
import {
  calculatePayrollTaxes,
  calculateAnnualPAYE,
  validateMinimumWage,
  getPayPeriodThreshold,
  calculateEffectiveTaxRate,
  PayPeriod,
  PayrollTaxResult,
  PAY_PERIODS_PER_YEAR,
  PAYE_CONFIG,
  NIS_CONFIG,
  NHT_CONFIG,
  EDUCATION_TAX_CONFIG,
  HEART_CONFIG,
} from '@/lib/jamaica-tax-calculator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalculateRequest {
  /**
   * Gross salary for calculation.
   * Can be for any pay period.
   */
  grossSalary: number;
  
  /**
   * Pay period for the salary provided.
   * Default: MONTHLY
   */
  payPeriod?: PayPeriod;
  
  /**
   * Year-to-date gross earnings (for accurate PAYE calculation).
   * Optional, defaults to 0 (first pay period).
   */
  ytdGrossEarnings?: number;
  
  /**
   * Year-to-date PAYE already paid.
   * Optional, defaults to 0.
   */
  ytdPayePaid?: number;
  
  /**
   * Include annual projections in response.
   * Default: true
   */
  includeAnnualProjection?: boolean;
  
  /**
   * Include breakdown of calculations.
   * Default: true
   */
  includeBreakdown?: boolean;
}

interface CalculateResponse {
  // Core calculation results
  calculation: PayrollTaxResult;
  
  // Effective rates
  effectiveRates: {
    totalDeductionRate: number;      // Total deductions as % of gross
    payeEffectiveRate: number;       // PAYE as % of gross
    totalEmployerRate: number;        // Employer contributions as % of gross
    takeHomeRate: number;             // Net pay as % of gross
  };
  
  // Minimum wage check
  minimumWage: {
    isValid: boolean;
    minimumRequired: number;
    deficit: number;
  };
  
  // Annual projections (if requested)
  annualProjection?: {
    grossAnnual: number;
    payeAnnual: number;
    nisAnnual: number;
    nhtAnnual: number;
    educationTaxAnnual: number;
    totalDeductionsAnnual: number;
    netAnnual: number;
    employerContributionsAnnual: number;
  };
  
  // Tax brackets and thresholds (for reference)
  taxInfo?: {
    payPeriodThreshold: number;
    annualThreshold: number;
    standardRate: number;
    higherRate: number;
    nisEmployeeRate: number;
    nisMaxContribution: number;
    nhtEmployeeRate: number;
    educationTaxEmployeeRate: number;
  };
}

// ---------------------------------------------------------------------------
// POST - Calculate payroll taxes (preview)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'payroll:read');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const body: CalculateRequest = await request.json();

    // Validate input
    if (body.grossSalary === undefined || body.grossSalary === null) {
      return badRequest('grossSalary is required');
    }

    if (body.grossSalary < 0) {
      return badRequest('grossSalary cannot be negative');
    }

    const payPeriod: PayPeriod = body.payPeriod ?? 'MONTHLY';
    const validPeriods: PayPeriod[] = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'];
    if (!validPeriods.includes(payPeriod)) {
      return badRequest('payPeriod must be WEEKLY, BIWEEKLY, or MONTHLY');
    }

    // Calculate taxes
    const calculation = calculatePayrollTaxes({
      grossSalary: body.grossSalary,
      payPeriod,
      ytdGrossEarnings: body.ytdGrossEarnings,
      ytdPayePaid: body.ytdPayePaid,
    });

    // Calculate effective rates
    const gross = calculation.grossSalary || 1; // Avoid division by zero
    const effectiveRates = {
      totalDeductionRate: round4(calculation.totalDeductions / gross),
      payeEffectiveRate: round4(calculation.paye / gross),
      totalEmployerRate: round4(calculation.totalEmployerContributions / gross),
      takeHomeRate: round4(calculation.netPay / gross),
    };

    // Check minimum wage
    const minWageCheck = validateMinimumWage(body.grossSalary, payPeriod);
    const minimumWage = {
      isValid: minWageCheck.isValid,
      minimumRequired: minWageCheck.minimumRequired,
      deficit: minWageCheck.isValid ? 0 : minWageCheck.minimumRequired - body.grossSalary,
    };

    // Build response
    const response: CalculateResponse = {
      calculation,
      effectiveRates,
      minimumWage,
    };

    // Add annual projection if requested
    if (body.includeAnnualProjection !== false) {
      const periodsPerYear = PAY_PERIODS_PER_YEAR[payPeriod];
      response.annualProjection = {
        grossAnnual: round2(calculation.grossSalary * periodsPerYear),
        payeAnnual: round2(calculation.paye * periodsPerYear),
        nisAnnual: round2(calculation.nis * periodsPerYear),
        nhtAnnual: round2(calculation.nht * periodsPerYear),
        educationTaxAnnual: round2(calculation.educationTax * periodsPerYear),
        totalDeductionsAnnual: round2(calculation.totalDeductions * periodsPerYear),
        netAnnual: round2(calculation.netPay * periodsPerYear),
        employerContributionsAnnual: round2(calculation.totalEmployerContributions * periodsPerYear),
      };
    }

    // Add tax info if requested
    if (body.includeBreakdown !== false) {
      let nisMax: number;
      switch (payPeriod) {
        case 'WEEKLY':
          nisMax = NIS_CONFIG.MAX_WEEKLY_CONTRIBUTION;
          break;
        case 'BIWEEKLY':
          nisMax = NIS_CONFIG.MAX_BIWEEKLY_CONTRIBUTION;
          break;
        case 'MONTHLY':
          nisMax = NIS_CONFIG.MAX_MONTHLY_CONTRIBUTION;
          break;
      }

      response.taxInfo = {
        payPeriodThreshold: getPayPeriodThreshold(payPeriod),
        annualThreshold: PAYE_CONFIG.ANNUAL_THRESHOLD,
        standardRate: PAYE_CONFIG.STANDARD_RATE,
        higherRate: PAYE_CONFIG.HIGHER_RATE,
        nisEmployeeRate: NIS_CONFIG.EMPLOYEE_RATE,
        nisMaxContribution: nisMax,
        nhtEmployeeRate: NHT_CONFIG.EMPLOYEE_RATE,
        educationTaxEmployeeRate: EDUCATION_TAX_CONFIG.EMPLOYEE_RATE,
      };
    }

    return NextResponse.json({
      message: 'Tax calculation completed',
      data: response,
    });
  } catch (error) {
    return internalError(
      error instanceof Error ? error.message : 'Failed to calculate taxes',
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
