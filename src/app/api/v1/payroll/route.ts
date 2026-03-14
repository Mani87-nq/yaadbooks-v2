/**
 * GET  /api/v1/payroll — List payroll runs
 * POST /api/v1/payroll — Create a new payroll run with server-side tax calculations
 *
 * TIER PROTECTED: Requires 'payroll' feature (Starter+)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import prisma from '@/lib/db';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { badRequest, internalError } from '@/lib/api-error';
import { calculatePayroll, type PayrollCalculation } from '@/lib/payroll/tax-calculator';
import { postPayrollRun } from '@/lib/accounting/engine';
import { withFeatureCheck } from '@/lib/tier';
import { auditPayroll } from '@/lib/audit';

// ─── GET: List payroll runs ──────────────────────────────────────

async function _GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'payroll:read');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const statusParam = searchParams.get('status');

    const where: any = {
      companyId: companyId!,
      ...(statusParam ? { status: statusParam as any } : {}),
    };

    const runs = await prisma.payrollRun.findMany({
      where,
      include: {
        entries: {
          select: {
            id: true,
            employeeId: true,
            employee: { select: { firstName: true, lastName: true } },
            grossPay: true,
            netPay: true,
            totalDeductions: true,
          },
        },
        _count: { select: { entries: true } },
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { periodEnd: 'desc' },
    });

    const hasMore = runs.length > limit;
    const data = hasMore ? runs.slice(0, limit) : runs;

    return NextResponse.json({
      data,
      pagination: { nextCursor: hasMore ? data[data.length - 1].id : null, hasMore, limit },
    });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to list payroll runs');
  }
}

// ─── POST: Create a new payroll run ──────────────────────────────

const payrollEntrySchema = z.object({
  employeeId: z.string().min(1),
  basicSalary: z.number().min(0),
  overtime: z.number().min(0).default(0),
  bonus: z.number().min(0).default(0),
  commission: z.number().min(0).default(0),
  allowances: z.number().min(0).default(0),
  pensionContribution: z.number().min(0).default(0),
  otherDeductions: z.number().min(0).default(0),
});

const createPayrollSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  payDate: z.coerce.date(),
  frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']).default('MONTHLY'),
  employees: z.array(payrollEntrySchema).min(1),
});

async function _POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'payroll:create');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const body = await request.json();
    const parsed = createPayrollSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return badRequest('Validation failed', fieldErrors);
    }

    const { periodStart, periodEnd, payDate, frequency, employees } = parsed.data;

    // Verify all employees belong to this company
    const employeeIds = employees.map((e) => e.employeeId);
    const dbEmployees = await prisma.employee.findMany({
      where: { id: { in: employeeIds }, companyId: companyId! },
      select: { id: true },
    });
    const validIds = new Set(dbEmployees.map((e) => e.id));
    const invalidIds = employeeIds.filter((id) => !validIds.has(id));
    if (invalidIds.length > 0) {
      return badRequest(`Employees not found: ${invalidIds.join(', ')}`);
    }

    // ── Determine fiscal year boundaries for YTD NIS ceiling tracking ──
    // Jamaica fiscal year: April 1 - March 31
    const periodStartDate = new Date(periodStart);
    const fiscalYearStart = periodStartDate.getMonth() >= 3 // April (0-indexed) = 3
      ? new Date(periodStartDate.getFullYear(), 3, 1)    // April 1 of current year
      : new Date(periodStartDate.getFullYear() - 1, 3, 1); // April 1 of previous year

    // Batch-fetch YTD NIS for all employees in this payroll
    const ytdData = await prisma.payrollEntry.groupBy({
      by: ['employeeId'],
      where: {
        employeeId: { in: employeeIds },
        payrollRun: {
          companyId: companyId!,
          periodEnd: { gte: fiscalYearStart, lt: periodStart },
          status: { in: ['DRAFT', 'APPROVED', 'PAID'] },
        },
      },
      _sum: {
        grossPay: true,
        nis: true,
      },
    });

    const ytdMap = new Map(
      ytdData.map((row) => [
        row.employeeId,
        {
          ytdGross: Number(row._sum.grossPay ?? 0),
          ytdNis: Number(row._sum.nis ?? 0),
        },
      ])
    );

    // ── Fetch active loan deductions for all employees ──
    const activeLoanDeductions = await prisma.loanDeduction.findMany({
      where: {
        employeeId: { in: employeeIds },
        companyId: companyId!,
        isActive: true,
        remainingBalance: { gt: 0 },
      },
      select: {
        id: true,
        employeeId: true,
        monthlyDeduction: true,
        remainingBalance: true,
        description: true,
      },
    });

    // Group loans by employee
    const loansByEmployee = new Map<string, typeof activeLoanDeductions>();
    for (const loan of activeLoanDeductions) {
      const existing = loansByEmployee.get(loan.employeeId) ?? [];
      existing.push(loan);
      loansByEmployee.set(loan.employeeId, existing);
    }

    // ── Fetch pension plan info for employees enrolled in a plan ──
    const employeesWithPension = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        pensionPlanId: { not: null },
      },
      select: {
        id: true,
        pensionPlan: {
          select: { employeeRate: true, employerRate: true, isApproved: true, isActive: true },
        },
      },
    });
    const pensionMap = new Map(
      employeesWithPension
        .filter(e => e.pensionPlan?.isActive)
        .map(e => [e.id, e.pensionPlan!])
    );

    // Calculate taxes server-side for each employee
    const calculations: Array<{
      employeeId: string;
      input: typeof employees[0];
      result: PayrollCalculation;
      loanDeductions: number;
      loanDetails: { loanId: string; amount: number; description: string }[];
      pensionEmployee: number;
      pensionEmployer: number;
    }> = [];

    for (const emp of employees) {
      const ytd = ytdMap.get(emp.employeeId) ?? { ytdGross: 0, ytdNis: 0 };

      // Calculate loan deduction total for this employee
      const empLoans = loansByEmployee.get(emp.employeeId) ?? [];
      let loanDeductionTotal = 0;
      const loanDetails: { loanId: string; amount: number; description: string }[] = [];
      for (const loan of empLoans) {
        const amount = Math.min(Number(loan.monthlyDeduction), Number(loan.remainingBalance));
        if (amount > 0) {
          loanDeductionTotal += amount;
          loanDetails.push({ loanId: loan.id, amount, description: loan.description });
        }
      }

      // Calculate pension contribution from plan (if enrolled)
      const pension = pensionMap.get(emp.employeeId);
      const grossForPension = emp.basicSalary + emp.overtime + emp.bonus + emp.commission;
      const pensionEmployee = pension ? Math.round(grossForPension * Number(pension.employeeRate) * 100) / 100 : 0;
      const pensionEmployer = pension ? Math.round(grossForPension * Number(pension.employerRate) * 100) / 100 : 0;

      // Use the higher of: explicit pension contribution OR plan-calculated pension
      const effectivePension = Math.max(emp.pensionContribution, pensionEmployee);

      // Include loan deductions in otherDeductions
      const totalOtherDeductions = emp.otherDeductions + loanDeductionTotal;

      const result = calculatePayroll({
        basicSalary: emp.basicSalary,
        overtime: emp.overtime,
        bonus: emp.bonus,
        commission: emp.commission,
        allowances: emp.allowances,
        pensionContribution: effectivePension,
        otherDeductions: totalOtherDeductions,
        frequency,
        ytdGross: ytd.ytdGross,
        ytdNis: ytd.ytdNis,
      });
      calculations.push({
        employeeId: emp.employeeId,
        input: emp,
        result,
        loanDeductions: loanDeductionTotal,
        loanDetails,
        pensionEmployee: effectivePension,
        pensionEmployer,
      });
    }

    // Aggregate totals
    const totals = {
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
      totalEmployerContributions: 0,
      totalPaye: 0,
      totalEmployeeNis: 0,
      totalEmployeeNht: 0,
      totalEmployeeEdTax: 0,
      totalEmployerNis: 0,
      totalEmployerNht: 0,
      totalEmployerEdTax: 0,
      totalHeart: 0,
    };

    for (const { result } of calculations) {
      totals.totalGross += result.grossPay;
      totals.totalDeductions += result.employee.totalDeductions;
      totals.totalNet += result.netPay;
      totals.totalEmployerContributions += result.employer.total;
      totals.totalPaye += result.employee.paye;
      totals.totalEmployeeNis += result.employee.nis;
      totals.totalEmployeeNht += result.employee.nht;
      totals.totalEmployeeEdTax += result.employee.educationTax;
      totals.totalEmployerNis += result.employer.nis;
      totals.totalEmployerNht += result.employer.nht;
      totals.totalEmployerEdTax += result.employer.educationTax;
      totals.totalHeart += result.employer.heartNta;
    }

    // Create payroll run + entries + GL journal entry in a single transaction
    const payrollRun = await prisma.$transaction(async (tx: any) => {
      const run = await tx.payrollRun.create({
        data: {
          companyId: companyId!,
          periodStart,
          periodEnd,
          payDate,
          status: 'DRAFT',
          totalGross: totals.totalGross,
          totalDeductions: totals.totalDeductions,
          totalNet: totals.totalNet,
          totalEmployerContributions: totals.totalEmployerContributions,
          createdBy: user!.sub,
          entries: {
            create: calculations.map(({ employeeId, input: empInput, result }) => ({
              employeeId,
              basicSalary: empInput.basicSalary,
              overtime: empInput.overtime,
              bonus: empInput.bonus,
              commission: empInput.commission,
              allowances: empInput.allowances,
              grossPay: result.grossPay,
              paye: result.employee.paye,
              nis: result.employee.nis,
              nht: result.employee.nht,
              educationTax: result.employee.educationTax,
              otherDeductions: result.employee.otherDeductions,
              totalDeductions: result.employee.totalDeductions,
              netPay: result.netPay,
              employerNis: result.employer.nis,
              employerNht: result.employer.nht,
              employerEducationTax: result.employer.educationTax,
              heartContribution: result.employer.heartNta,
              totalEmployerContributions: result.employer.total,
            })),
          },
        },
        include: {
          entries: {
            include: {
              employee: { select: { firstName: true, lastName: true, email: true } },
            },
          },
        },
      });

      // ── Update loan balances after payroll entries are created ──
      for (const calc of calculations) {
        for (const loan of calc.loanDetails) {
          await tx.loanDeduction.update({
            where: { id: loan.loanId },
            data: {
              totalPaid: { increment: loan.amount },
              remainingBalance: { decrement: loan.amount },
            },
          });

          // Auto-deactivate fully paid loans
          const updated = await tx.loanDeduction.findUnique({
            where: { id: loan.loanId },
            select: { remainingBalance: true },
          });
          if (updated && Number(updated.remainingBalance) <= 0) {
            await tx.loanDeduction.update({
              where: { id: loan.loanId },
              data: { isActive: false },
            });
          }
        }
      }

      return run;
    });

    // Audit log the payroll creation (fire-and-forget)
    auditPayroll(
      'PAYROLL_RUN_CREATED',
      payrollRun.id,
      companyId!,
      user!.sub,
      {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        payDate: payDate.toISOString(),
        employeeCount: employees.length,
        totalGross: totals.totalGross,
        totalNet: totals.totalNet,
        totalDeductions: totals.totalDeductions,
        totalEmployerContributions: totals.totalEmployerContributions,
      },
      request
    ).catch(() => {});

    return NextResponse.json(payrollRun, { status: 201 });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to create payroll run');
  }
}

// Tier-protected exports: Requires 'payroll' feature (Starter+)
export const GET = withFeatureCheck('payroll', _GET);
export const POST = withFeatureCheck('payroll', _POST);
