/**
 * GET/POST /api/v1/payroll
 *
 * GET  - List all payroll runs for the company
 * POST - Create a new payroll run with auto-calculated taxes
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { badRequest, internalError } from '@/lib/api-error';
import { Prisma } from '@prisma/client';
import {
  calculatePayrollTaxes,
  PayPeriod,
  PayrollTaxResult,
} from '@/lib/jamaica-tax-calculator';
import { calculateAllDeductions } from '@/lib/payroll/loan-deductions';

const Decimal = Prisma.Decimal;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PayrollRunCreateRequest {
  periodStart: string; // ISO date
  periodEnd: string;   // ISO date
  payDate: string;     // ISO date
  
  /**
   * List of employees to include in this payroll run.
   * If omitted, all active employees will be included.
   */
  employeeIds?: string[];
  
  /**
   * Custom earnings overrides per employee.
   * If not provided, uses the employee's base salary.
   */
  employeeEarnings?: Array<{
    employeeId: string;
    basicSalary?: number;
    overtime?: number;
    bonus?: number;
    commission?: number;
    allowances?: number;
  }>;
}

// ---------------------------------------------------------------------------
// GET - List payroll runs
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'payroll:read');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const year = searchParams.get('year');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const where: Prisma.PayrollRunWhereInput = {
      companyId: companyId!,
    };

    if (status) {
      where.status = status as Prisma.EnumPayrollStatusFilter;
    }

    if (year) {
      const yearNum = parseInt(year);
      where.periodStart = {
        gte: new Date(`${yearNum}-01-01`),
        lt: new Date(`${yearNum + 1}-01-01`),
      };
    }

    const [payrollRuns, total] = await Promise.all([
      prisma.payrollRun.findMany({
        where,
        include: {
          _count: { select: { entries: true } },
        },
        orderBy: { payDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.payrollRun.count({ where }),
    ]);

    return NextResponse.json({
      data: payrollRuns.map(run => ({
        ...run,
        totalGross: Number(run.totalGross),
        totalDeductions: Number(run.totalDeductions),
        totalNet: Number(run.totalNet),
        totalEmployerContributions: Number(run.totalEmployerContributions),
        employeeCount: run._count.entries,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    return internalError(
      error instanceof Error ? error.message : 'Failed to fetch payroll runs',
    );
  }
}

// ---------------------------------------------------------------------------
// POST - Create payroll run with auto-calculated taxes
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'payroll:create');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const body: PayrollRunCreateRequest = await request.json();

    // Validate required fields
    if (!body.periodStart || !body.periodEnd || !body.payDate) {
      return badRequest('periodStart, periodEnd, and payDate are required');
    }

    const periodStart = new Date(body.periodStart);
    const periodEnd = new Date(body.periodEnd);
    const payDate = new Date(body.payDate);

    // Validate dates
    if (periodEnd <= periodStart) {
      return badRequest('periodEnd must be after periodStart');
    }

    // Determine pay period from date range
    const daysDiff = Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    let payPeriod: PayPeriod;
    if (daysDiff <= 8) {
      payPeriod = 'WEEKLY';
    } else if (daysDiff <= 16) {
      payPeriod = 'BIWEEKLY';
    } else {
      payPeriod = 'MONTHLY';
    }

    // Fetch employees
    const employeeWhere: Prisma.EmployeeWhereInput = {
      companyId: companyId!,
      isActive: true,
      deletedAt: null,
    };

    if (body.employeeIds?.length) {
      employeeWhere.id = { in: body.employeeIds };
    }

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        baseSalary: true,
        paymentFrequency: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
      },
    });

    if (employees.length === 0) {
      return badRequest('No active employees found for payroll run');
    }

    // Create earnings map from overrides
    const earningsMap = new Map(
      body.employeeEarnings?.map(e => [e.employeeId, e]) ?? []
    );

    // Calculate taxes for each employee
    const payrollEntries: Array<{
      employeeId: string;
      taxes: PayrollTaxResult;
      loanDeductions: number;
      basicSalary: number;
      overtime: number;
      bonus: number;
      commission: number;
      allowances: number;
    }> = [];

    let runTotalGross = 0;
    let runTotalDeductions = 0;
    let runTotalNet = 0;
    let runTotalEmployerContributions = 0;

    for (const employee of employees) {
      const earnings = earningsMap.get(employee.id);
      
      // Determine salary for this period
      const employeePayFreq = employee.paymentFrequency;
      let baseSalary = Number(employee.baseSalary);
      
      // Convert employee's base salary to match the payroll period if needed
      if (employeePayFreq !== payPeriod) {
        // Convert to annual then to target period
        const annualSalary = baseSalary * getPeriodsPerYear(employeePayFreq);
        baseSalary = annualSalary / getPeriodsPerYear(payPeriod);
      }

      // Apply any overrides
      const finalBasicSalary = earnings?.basicSalary ?? baseSalary;
      const overtime = earnings?.overtime ?? 0;
      const bonus = earnings?.bonus ?? 0;
      const commission = earnings?.commission ?? 0;
      const allowances = earnings?.allowances ?? 0;

      const grossSalary = finalBasicSalary + overtime + bonus + commission + allowances;

      // Calculate Jamaica payroll taxes
      const taxes = calculatePayrollTaxes({
        grossSalary,
        payPeriod,
      });

      // Get loan/other deductions for this employee
      const loanDeductionItems = await calculateAllDeductions(employee.id);
      const loanDeductions = loanDeductionItems.reduce((sum, d) => sum + d.amount, 0);

      payrollEntries.push({
        employeeId: employee.id,
        taxes,
        loanDeductions,
        basicSalary: finalBasicSalary,
        overtime,
        bonus,
        commission,
        allowances,
      });

      runTotalGross += taxes.grossSalary;
      runTotalDeductions += taxes.totalDeductions + loanDeductions;
      runTotalNet += taxes.netPay - loanDeductions;
      runTotalEmployerContributions += taxes.totalEmployerContributions;
    }

    // Create payroll run and entries in a transaction
    const payrollRun = await prisma.$transaction(async (tx) => {
      // Create the payroll run
      const run = await tx.payrollRun.create({
        data: {
          companyId: companyId!,
          periodStart,
          periodEnd,
          payDate,
          status: 'DRAFT',
          totalGross: new Decimal(runTotalGross.toFixed(2)),
          totalDeductions: new Decimal(runTotalDeductions.toFixed(2)),
          totalNet: new Decimal(runTotalNet.toFixed(2)),
          totalEmployerContributions: new Decimal(runTotalEmployerContributions.toFixed(2)),
          createdBy: user!.sub,
        },
      });

      // Create payroll entries for each employee
      for (const entry of payrollEntries) {
        const { taxes, loanDeductions } = entry;
        
        await tx.payrollEntry.create({
          data: {
            payrollRunId: run.id,
            employeeId: entry.employeeId,
            
            // Earnings
            basicSalary: new Decimal(entry.basicSalary.toFixed(2)),
            overtime: new Decimal(entry.overtime.toFixed(2)),
            bonus: new Decimal(entry.bonus.toFixed(2)),
            commission: new Decimal(entry.commission.toFixed(2)),
            allowances: new Decimal(entry.allowances.toFixed(2)),
            grossPay: new Decimal(taxes.grossSalary.toFixed(2)),
            
            // Employee deductions (calculated by jamaica-tax-calculator)
            paye: new Decimal(taxes.paye.toFixed(2)),
            nis: new Decimal(taxes.nis.toFixed(2)),
            nht: new Decimal(taxes.nht.toFixed(2)),
            educationTax: new Decimal(taxes.educationTax.toFixed(2)),
            otherDeductions: new Decimal(loanDeductions.toFixed(2)),
            totalDeductions: new Decimal((taxes.totalDeductions + loanDeductions).toFixed(2)),
            netPay: new Decimal((taxes.netPay - loanDeductions).toFixed(2)),
            
            // Employer contributions (calculated by jamaica-tax-calculator)
            employerNis: new Decimal(taxes.employerNis.toFixed(2)),
            employerNht: new Decimal(taxes.employerNht.toFixed(2)),
            employerEducationTax: new Decimal(taxes.employerEducationTax.toFixed(2)),
            heartContribution: new Decimal(taxes.heartContribution.toFixed(2)),
            totalEmployerContributions: new Decimal(taxes.totalEmployerContributions.toFixed(2)),
          },
        });
      }

      return run;
    });

    // Fetch the complete payroll run with entries
    const completeRun = await prisma.payrollRun.findUnique({
      where: { id: payrollRun.id },
      include: {
        entries: {
          include: {
            employee: {
              select: {
                id: true,
                employeeNumber: true,
                firstName: true,
                lastName: true,
                position: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Payroll run created successfully with auto-calculated taxes',
        data: {
          ...completeRun,
          totalGross: Number(completeRun!.totalGross),
          totalDeductions: Number(completeRun!.totalDeductions),
          totalNet: Number(completeRun!.totalNet),
          totalEmployerContributions: Number(completeRun!.totalEmployerContributions),
          entries: completeRun!.entries.map(e => ({
            ...e,
            basicSalary: Number(e.basicSalary),
            overtime: Number(e.overtime),
            bonus: Number(e.bonus),
            commission: Number(e.commission),
            allowances: Number(e.allowances),
            grossPay: Number(e.grossPay),
            paye: Number(e.paye),
            nis: Number(e.nis),
            nht: Number(e.nht),
            educationTax: Number(e.educationTax),
            otherDeductions: Number(e.otherDeductions),
            totalDeductions: Number(e.totalDeductions),
            netPay: Number(e.netPay),
            employerNis: Number(e.employerNis),
            employerNht: Number(e.employerNht),
            employerEducationTax: Number(e.employerEducationTax),
            heartContribution: Number(e.heartContribution),
            totalEmployerContributions: Number(e.totalEmployerContributions),
          })),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Payroll creation error:', error);
    return internalError(
      error instanceof Error ? error.message : 'Failed to create payroll run',
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPeriodsPerYear(freq: string): number {
  switch (freq) {
    case 'WEEKLY':
      return 52;
    case 'BIWEEKLY':
      return 26;
    case 'MONTHLY':
    default:
      return 12;
  }
}
