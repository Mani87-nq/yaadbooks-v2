/**
 * GET/PUT/DELETE /api/v1/payroll/[runId]
 *
 * GET    - Fetch a single payroll run with entries
 * PUT    - Update payroll run (status, recalculate, etc.)
 * DELETE - Delete a draft payroll run
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { badRequest, notFound, internalError } from '@/lib/api-error';
import { Prisma } from '@prisma/client';
import {
  calculatePayrollTaxes,
  PayPeriod,
} from '@/lib/jamaica-tax-calculator';
import { calculateAllDeductions } from '@/lib/payroll/loan-deductions';

const Decimal = Prisma.Decimal;

type RouteContext = { params: Promise<{ runId: string }> };

// ---------------------------------------------------------------------------
// GET - Fetch payroll run
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { runId } = await context.params;

    const { user, error: authError } = await requirePermission(request, 'payroll:read');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const payrollRun = await prisma.payrollRun.findFirst({
      where: { id: runId, companyId: companyId! },
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
                trnNumber: true,
                nisNumber: true,
              },
            },
          },
        },
      },
    });

    if (!payrollRun) {
      return notFound('Payroll run not found');
    }

    return NextResponse.json({
      data: {
        ...payrollRun,
        totalGross: Number(payrollRun.totalGross),
        totalDeductions: Number(payrollRun.totalDeductions),
        totalNet: Number(payrollRun.totalNet),
        totalEmployerContributions: Number(payrollRun.totalEmployerContributions),
        entries: payrollRun.entries.map(e => ({
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
    });
  } catch (error) {
    return internalError(
      error instanceof Error ? error.message : 'Failed to fetch payroll run',
    );
  }
}

// ---------------------------------------------------------------------------
// PUT - Update payroll run
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { runId } = await context.params;

    const { user, error: authError } = await requirePermission(request, 'payroll:create');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const payrollRun = await prisma.payrollRun.findFirst({
      where: { id: runId, companyId: companyId! },
      include: { entries: true },
    });

    if (!payrollRun) {
      return notFound('Payroll run not found');
    }

    const body = await request.json();

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['APPROVED', 'DRAFT'], // Can stay DRAFT for recalculation
      APPROVED: ['PAID', 'DRAFT'],   // Can revert to DRAFT or mark as PAID
      PAID: [],                       // Final state
    };

    if (body.status && !validTransitions[payrollRun.status]?.includes(body.status)) {
      return badRequest(`Cannot transition from ${payrollRun.status} to ${body.status}`);
    }

    // Handle recalculation request
    if (body.recalculate && payrollRun.status === 'DRAFT') {
      // Determine pay period
      const daysDiff = Math.round(
        (payrollRun.periodEnd.getTime() - payrollRun.periodStart.getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      let payPeriod: PayPeriod;
      if (daysDiff <= 8) {
        payPeriod = 'WEEKLY';
      } else if (daysDiff <= 16) {
        payPeriod = 'BIWEEKLY';
      } else {
        payPeriod = 'MONTHLY';
      }

      // Recalculate each entry
      let runTotalGross = 0;
      let runTotalDeductions = 0;
      let runTotalNet = 0;
      let runTotalEmployerContributions = 0;

      for (const entry of payrollRun.entries) {
        const grossSalary = Number(entry.basicSalary) + Number(entry.overtime) +
                           Number(entry.bonus) + Number(entry.commission) +
                           Number(entry.allowances);

        const taxes = calculatePayrollTaxes({
          grossSalary,
          payPeriod,
        });

        const loanDeductionItems = await calculateAllDeductions(entry.employeeId);
        const loanDeductions = loanDeductionItems.reduce((sum, d) => sum + d.amount, 0);

        await prisma.payrollEntry.update({
          where: { id: entry.id },
          data: {
            grossPay: new Decimal(taxes.grossSalary.toFixed(2)),
            paye: new Decimal(taxes.paye.toFixed(2)),
            nis: new Decimal(taxes.nis.toFixed(2)),
            nht: new Decimal(taxes.nht.toFixed(2)),
            educationTax: new Decimal(taxes.educationTax.toFixed(2)),
            otherDeductions: new Decimal(loanDeductions.toFixed(2)),
            totalDeductions: new Decimal((taxes.totalDeductions + loanDeductions).toFixed(2)),
            netPay: new Decimal((taxes.netPay - loanDeductions).toFixed(2)),
            employerNis: new Decimal(taxes.employerNis.toFixed(2)),
            employerNht: new Decimal(taxes.employerNht.toFixed(2)),
            employerEducationTax: new Decimal(taxes.employerEducationTax.toFixed(2)),
            heartContribution: new Decimal(taxes.heartContribution.toFixed(2)),
            totalEmployerContributions: new Decimal(taxes.totalEmployerContributions.toFixed(2)),
          },
        });

        runTotalGross += taxes.grossSalary;
        runTotalDeductions += taxes.totalDeductions + loanDeductions;
        runTotalNet += taxes.netPay - loanDeductions;
        runTotalEmployerContributions += taxes.totalEmployerContributions;
      }

      // Update totals
      await prisma.payrollRun.update({
        where: { id: runId },
        data: {
          totalGross: new Decimal(runTotalGross.toFixed(2)),
          totalDeductions: new Decimal(runTotalDeductions.toFixed(2)),
          totalNet: new Decimal(runTotalNet.toFixed(2)),
          totalEmployerContributions: new Decimal(runTotalEmployerContributions.toFixed(2)),
        },
      });
    }

    // Update status and approval
    const updateData: Prisma.PayrollRunUpdateInput = {};

    if (body.status) {
      updateData.status = body.status;
      
      if (body.status === 'APPROVED') {
        updateData.approvedBy = user!.sub;
        updateData.approvedAt = new Date();
      }
    }

    if (body.payDate) {
      updateData.payDate = new Date(body.payDate);
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.payrollRun.update({
        where: { id: runId },
        data: updateData,
      });
    }

    // Fetch updated run
    const updatedRun = await prisma.payrollRun.findUnique({
      where: { id: runId },
      include: {
        entries: {
          include: {
            employee: {
              select: {
                id: true,
                employeeNumber: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: body.recalculate 
        ? 'Payroll taxes recalculated successfully' 
        : 'Payroll run updated successfully',
      data: {
        ...updatedRun,
        totalGross: Number(updatedRun!.totalGross),
        totalDeductions: Number(updatedRun!.totalDeductions),
        totalNet: Number(updatedRun!.totalNet),
        totalEmployerContributions: Number(updatedRun!.totalEmployerContributions),
      },
    });
  } catch (error) {
    return internalError(
      error instanceof Error ? error.message : 'Failed to update payroll run',
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE - Delete draft payroll run
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { runId } = await context.params;

    const { user, error: authError } = await requirePermission(request, 'payroll:create');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const payrollRun = await prisma.payrollRun.findFirst({
      where: { id: runId, companyId: companyId! },
    });

    if (!payrollRun) {
      return notFound('Payroll run not found');
    }

    if (payrollRun.status !== 'DRAFT') {
      return badRequest('Only draft payroll runs can be deleted');
    }

    // Delete will cascade to entries due to schema
    await prisma.payrollRun.delete({
      where: { id: runId },
    });

    return NextResponse.json({
      message: 'Payroll run deleted successfully',
    });
  } catch (error) {
    return internalError(
      error instanceof Error ? error.message : 'Failed to delete payroll run',
    );
  }
}
