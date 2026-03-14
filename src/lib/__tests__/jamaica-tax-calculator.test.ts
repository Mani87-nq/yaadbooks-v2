/**
 * Tests for Jamaica Payroll Tax Calculator
 * 
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePayrollTaxes,
  calculateAnnualPAYE,
  calculateNIS,
  calculateNHT,
  calculateEducationTax,
  calculateHEART,
  validateMinimumWage,
  getPayPeriodThreshold,
  convertPayPeriod,
  PAYE_CONFIG,
  NIS_CONFIG,
  PayPeriod,
} from '../jamaica-tax-calculator';

describe('Jamaica Payroll Tax Calculator', () => {
  describe('calculatePayrollTaxes', () => {
    it('should calculate taxes for a typical monthly salary', () => {
      const result = calculatePayrollTaxes({
        grossSalary: 150000, // J$150,000 monthly
        payPeriod: 'MONTHLY',
      });

      expect(result.grossSalary).toBe(150000);
      expect(result.netPay).toBeLessThan(result.grossSalary);
      expect(result.totalDeductions).toBeGreaterThan(0);
      expect(result.totalEmployerContributions).toBeGreaterThan(0);
      
      // Check all components are present
      expect(result.paye).toBeGreaterThanOrEqual(0);
      expect(result.nis).toBeGreaterThan(0);
      expect(result.nht).toBeGreaterThan(0);
      expect(result.educationTax).toBeGreaterThan(0);
    });

    it('should return zero PAYE for salary below threshold', () => {
      // Annual threshold is J$1,500,096
      // Monthly threshold = J$125,008
      const result = calculatePayrollTaxes({
        grossSalary: 100000, // J$100,000 monthly (below threshold)
        payPeriod: 'MONTHLY',
      });

      expect(result.paye).toBe(0);
    });

    it('should calculate PAYE at 25% for income between threshold and J$6M', () => {
      // Monthly salary of J$200,000 = J$2,400,000 annually
      // Above J$1,500,096 threshold but below J$6M
      const result = calculatePayrollTaxes({
        grossSalary: 200000,
        payPeriod: 'MONTHLY',
      });

      // PAYE should be (200,000 - 125,008) * 25% = ~18,748
      expect(result.paye).toBeGreaterThan(0);
      expect(result.breakdown.taxBand).toBe('STANDARD');
    });

    it('should handle weekly pay periods', () => {
      const result = calculatePayrollTaxes({
        grossSalary: 40000, // J$40,000 weekly
        payPeriod: 'WEEKLY',
      });

      expect(result.breakdown.payPeriod).toBe('WEEKLY');
      expect(result.breakdown.periodsPerYear).toBe(52);
      expect(result.nis).toBeLessThanOrEqual(NIS_CONFIG.MAX_WEEKLY_CONTRIBUTION);
    });

    it('should handle bi-weekly pay periods', () => {
      const result = calculatePayrollTaxes({
        grossSalary: 80000, // J$80,000 bi-weekly
        payPeriod: 'BIWEEKLY',
      });

      expect(result.breakdown.payPeriod).toBe('BIWEEKLY');
      expect(result.breakdown.periodsPerYear).toBe(26);
      expect(result.nis).toBeLessThanOrEqual(NIS_CONFIG.MAX_BIWEEKLY_CONTRIBUTION);
    });

    it('should cap NIS at maximum contribution', () => {
      const result = calculatePayrollTaxes({
        grossSalary: 500000, // J$500,000 monthly (NIS would be J$15,000 but capped at J$13,000)
        payPeriod: 'MONTHLY',
      });

      expect(result.nis).toBe(NIS_CONFIG.MAX_MONTHLY_CONTRIBUTION);
      expect(result.employerNis).toBe(NIS_CONFIG.MAX_MONTHLY_CONTRIBUTION);
      expect(result.breakdown.nisMaxApplied).toBe(true);
    });

    it('should throw error for negative salary', () => {
      expect(() => {
        calculatePayrollTaxes({
          grossSalary: -1000,
          payPeriod: 'MONTHLY',
        });
      }).toThrow('Gross salary cannot be negative');
    });

    it('should handle zero salary', () => {
      const result = calculatePayrollTaxes({
        grossSalary: 0,
        payPeriod: 'MONTHLY',
      });

      expect(result.grossSalary).toBe(0);
      expect(result.paye).toBe(0);
      expect(result.nis).toBe(0);
      expect(result.nht).toBe(0);
      expect(result.educationTax).toBe(0);
      expect(result.netPay).toBe(0);
    });
  });

  describe('calculateAnnualPAYE', () => {
    it('should return zero for income below threshold', () => {
      const paye = calculateAnnualPAYE(1000000); // J$1M < J$1,500,096
      expect(paye).toBe(0);
    });

    it('should calculate 25% on income above threshold up to J$6M', () => {
      // J$2,500,096 annual = J$1,000,000 taxable
      const paye = calculateAnnualPAYE(2500096);
      expect(paye).toBe(250000); // J$1M * 25%
    });

    it('should calculate 30% on income above J$6M', () => {
      // J$7,000,000 annual
      // First band: (J$6M - J$1,500,096) * 25% = J$1,124,976
      // Second band: (J$7M - J$6M) * 30% = J$300,000
      // Total: J$1,424,976
      const paye = calculateAnnualPAYE(7000000);
      expect(paye).toBeCloseTo(1424976, 0);
    });
  });

  describe('calculateNIS', () => {
    it('should calculate 3% for employee and employer', () => {
      const result = calculateNIS(100000, 'MONTHLY');
      
      expect(result.employeeContribution).toBe(3000); // 3% of 100,000
      expect(result.employerContribution).toBe(3000);
      expect(result.maxApplied).toBe(false);
    });

    it('should apply weekly maximum', () => {
      const result = calculateNIS(150000, 'WEEKLY'); // 3% = 4,500, but max is 3,000
      
      expect(result.employeeContribution).toBe(3000);
      expect(result.maxApplied).toBe(true);
    });

    it('should apply monthly maximum', () => {
      const result = calculateNIS(500000, 'MONTHLY'); // 3% = 15,000, but max is 13,000
      
      expect(result.employeeContribution).toBe(13000);
      expect(result.maxApplied).toBe(true);
    });
  });

  describe('calculateNHT', () => {
    it('should calculate 2% for employee', () => {
      const result = calculateNHT(100000, 'EMPLOYEE');
      expect(result).toBe(2000);
    });

    it('should calculate 3% for employer', () => {
      const result = calculateNHT(100000, 'EMPLOYER');
      expect(result).toBe(3000);
    });
  });

  describe('calculateEducationTax', () => {
    it('should calculate 2.25% for employee', () => {
      const result = calculateEducationTax(100000, 'EMPLOYEE');
      expect(result).toBe(2250);
    });

    it('should calculate 3.5% for employer', () => {
      const result = calculateEducationTax(100000, 'EMPLOYER');
      expect(result).toBe(3500);
    });
  });

  describe('calculateHEART', () => {
    it('should calculate 3% for employer', () => {
      const result = calculateHEART(100000);
      expect(result).toBe(3000);
    });
  });

  describe('validateMinimumWage', () => {
    it('should validate weekly minimum wage', () => {
      const result = validateMinimumWage(16000, 'WEEKLY');
      expect(result.isValid).toBe(true);
      expect(result.minimumRequired).toBe(16000);
    });

    it('should fail for salary below minimum wage', () => {
      const result = validateMinimumWage(10000, 'WEEKLY');
      expect(result.isValid).toBe(false);
    });

    it('should calculate monthly minimum correctly', () => {
      const result = validateMinimumWage(69334, 'MONTHLY');
      expect(result.minimumRequired).toBe(69333); // (16000 * 52) / 12
    });
  });

  describe('getPayPeriodThreshold', () => {
    it('should return correct monthly threshold', () => {
      const threshold = getPayPeriodThreshold('MONTHLY');
      expect(threshold).toBeCloseTo(PAYE_CONFIG.ANNUAL_THRESHOLD / 12, 0);
    });

    it('should return correct weekly threshold', () => {
      const threshold = getPayPeriodThreshold('WEEKLY');
      expect(threshold).toBeCloseTo(PAYE_CONFIG.ANNUAL_THRESHOLD / 52, 0);
    });
  });

  describe('convertPayPeriod', () => {
    it('should convert monthly to annual', () => {
      const annual = convertPayPeriod(100000, 'MONTHLY', 'WEEKLY');
      expect(annual).toBeCloseTo(100000 * 12 / 52, 2);
    });

    it('should convert weekly to monthly', () => {
      const monthly = convertPayPeriod(20000, 'WEEKLY', 'MONTHLY');
      expect(monthly).toBeCloseTo(20000 * 52 / 12, 2);
    });
  });

  describe('Integration: Full Payroll Calculation', () => {
    it('should produce consistent totals', () => {
      const result = calculatePayrollTaxes({
        grossSalary: 250000,
        payPeriod: 'MONTHLY',
      });

      // Verify totals add up
      const expectedTotalDeductions = result.paye + result.nis + result.nht + result.educationTax;
      expect(result.totalDeductions).toBeCloseTo(expectedTotalDeductions, 2);

      const expectedNetPay = result.grossSalary - result.totalDeductions;
      expect(result.netPay).toBeCloseTo(expectedNetPay, 2);

      const expectedEmployerContributions = 
        result.employerNis + result.employerNht + 
        result.employerEducationTax + result.heartContribution;
      expect(result.totalEmployerContributions).toBeCloseTo(expectedEmployerContributions, 2);
    });

    it('should match known good calculation (J$200,000 monthly)', () => {
      // Example: J$200,000 monthly salary
      // Expected calculations:
      // - Annualised: J$2,400,000
      // - Taxable: J$2,400,000 - J$1,500,096 = J$899,904
      // - Annual PAYE: J$899,904 * 25% = J$224,976
      // - Monthly PAYE: J$224,976 / 12 = J$18,748
      // - NIS: J$6,000 (3% of J$200,000)
      // - NHT: J$4,000 (2% of J$200,000)
      // - Education Tax: J$4,500 (2.25% of J$200,000)
      
      const result = calculatePayrollTaxes({
        grossSalary: 200000,
        payPeriod: 'MONTHLY',
      });

      expect(result.paye).toBeCloseTo(18748, 0);
      expect(result.nis).toBe(6000);
      expect(result.nht).toBe(4000);
      expect(result.educationTax).toBe(4500);
      
      // Net pay = 200,000 - 18,748 - 6,000 - 4,000 - 4,500 = 166,752
      expect(result.netPay).toBeCloseTo(166752, 0);
    });

    it('should match known good calculation (J$150,000 monthly) - TASK SPEC', () => {
      // From task specification:
      // Monthly salary: J$150,000
      // Expected calculations:
      // - Annual: J$1,800,000
      // - Taxable: J$1,800,000 - J$1,500,096 = J$299,904
      // - Annual PAYE: J$299,904 × 25% = J$74,976
      // - Monthly PAYE: J$74,976 / 12 = J$6,248
      // - NIS: 3% of J$150,000 = J$4,500 (below max J$13,000)
      // - NHT: 2% of J$150,000 = J$3,000
      // - Ed Tax: 2.25% of J$150,000 = J$3,375
      // - Total deductions: ~J$17,123
      // - Net pay: ~J$132,877
      
      const result = calculatePayrollTaxes({
        grossSalary: 150000,
        payPeriod: 'MONTHLY',
      });

      // Verify annualized figures
      expect(result.breakdown.annualisedGross).toBe(1800000);
      
      // Verify PAYE (main tax)
      expect(result.paye).toBeCloseTo(6248, 0);
      
      // Verify statutory deductions
      expect(result.nis).toBe(4500);
      expect(result.nht).toBe(3000);
      expect(result.educationTax).toBe(3375);
      
      // Verify totals
      expect(result.totalDeductions).toBeCloseTo(17123, 0);
      expect(result.netPay).toBeCloseTo(132877, 0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle salary exactly at threshold (no PAYE)', () => {
      // J$1,500,096 / 12 = J$125,008
      const result = calculatePayrollTaxes({
        grossSalary: 125008,
        payPeriod: 'MONTHLY',
      });

      expect(result.paye).toBe(0);
      expect(result.nis).toBe(3750.24); // 3% of 125,008
      expect(result.nht).toBe(2500.16); // 2% of 125,008
    });

    it('should apply 30% rate for income above J$6M annually', () => {
      // J$600,000 monthly = J$7,200,000 annually
      // First band: (J$6M - J$1,500,096) × 25% = J$1,124,976
      // Second band: (J$7.2M - J$6M) × 30% = J$360,000
      // Annual PAYE: J$1,484,976
      // Monthly PAYE: J$123,748
      
      const result = calculatePayrollTaxes({
        grossSalary: 600000,
        payPeriod: 'MONTHLY',
      });

      expect(result.breakdown.annualisedGross).toBe(7200000);
      expect(result.paye).toBeCloseTo(123748, 0);
      // NIS should be capped at J$13,000
      expect(result.nis).toBe(13000);
      expect(result.breakdown.nisMaxApplied).toBe(true);
    });

    it('should handle weekly salary correctly', () => {
      // J$40,000 weekly
      // Annual: J$2,080,000
      // Taxable: J$2,080,000 - J$1,500,096 = J$579,904
      // Annual PAYE: J$579,904 × 25% = J$144,976
      // Weekly PAYE: J$144,976 / 52 = J$2,788
      
      const result = calculatePayrollTaxes({
        grossSalary: 40000,
        payPeriod: 'WEEKLY',
      });

      expect(result.breakdown.periodsPerYear).toBe(52);
      expect(result.paye).toBeCloseTo(2788, 0);
      // NIS weekly max is J$3,000
      // 3% of 40,000 = 1,200 (below max)
      expect(result.nis).toBe(1200);
    });

    it('should handle bi-weekly salary correctly', () => {
      // J$75,000 bi-weekly
      // Annual: J$1,950,000
      // Taxable: J$1,950,000 - J$1,500,096 = J$449,904
      // Annual PAYE: J$449,904 × 25% = J$112,476
      // Bi-weekly PAYE: J$112,476 / 26 = J$4,326
      
      const result = calculatePayrollTaxes({
        grossSalary: 75000,
        payPeriod: 'BIWEEKLY',
      });

      expect(result.breakdown.periodsPerYear).toBe(26);
      expect(result.paye).toBeCloseTo(4326, 0);
      // NIS bi-weekly max is J$6,000
      // 3% of 75,000 = 2,250 (below max)
      expect(result.nis).toBe(2250);
    });

    it('should cap NIS at weekly maximum', () => {
      // J$150,000 weekly (very high weekly salary)
      // NIS: 3% = J$4,500, but max weekly is J$3,000
      
      const result = calculatePayrollTaxes({
        grossSalary: 150000,
        payPeriod: 'WEEKLY',
      });

      expect(result.nis).toBe(3000);
      expect(result.breakdown.nisMaxApplied).toBe(true);
    });

    it('should cap NIS at bi-weekly maximum', () => {
      // J$250,000 bi-weekly
      // NIS: 3% = J$7,500, but max bi-weekly is J$6,000
      
      const result = calculatePayrollTaxes({
        grossSalary: 250000,
        payPeriod: 'BIWEEKLY',
      });

      expect(result.nis).toBe(6000);
      expect(result.breakdown.nisMaxApplied).toBe(true);
    });

    it('should calculate employer contributions correctly', () => {
      const result = calculatePayrollTaxes({
        grossSalary: 200000,
        payPeriod: 'MONTHLY',
      });

      // Employer NIS: same as employee (3%)
      expect(result.employerNis).toBe(6000);
      // Employer NHT: 3%
      expect(result.employerNht).toBe(6000);
      // Employer Education Tax: 3.5%
      expect(result.employerEducationTax).toBe(7000);
      // HEART: 3%
      expect(result.heartContribution).toBe(6000);
      // Total: 6000 + 6000 + 7000 + 6000 = 25,000
      expect(result.totalEmployerContributions).toBe(25000);
    });
  });
});
