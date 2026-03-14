/**
 * GET/POST /api/v1/bank-reconciliation
 * Bank Reconciliation management.
 * - GET: List reconciliations for a bank account
 * - POST: Start a new reconciliation
 *
 * TIER PROTECTED: Requires 'bank_reconciliation' feature (Starter+)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import prisma from '@/lib/db';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { badRequest, internalError } from '@/lib/api-error';
import { withFeatureCheck } from '@/lib/tier';

async function _GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'banking:read');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const { searchParams } = new URL(request.url);
    const bankAccountId = searchParams.get('bankAccountId');

    const where: Record<string, unknown> = {
      bankAccount: { companyId },
    };
    if (bankAccountId) {
      where.bankAccountId = bankAccountId;
    }

    const reconciliations = await prisma.bankReconciliation.findMany({
      where,
      include: {
        bankAccount: { select: { id: true, accountName: true, bankName: true, accountNumber: true } },
      },
      orderBy: { periodEnd: 'desc' },
    });

    return NextResponse.json({ data: reconciliations });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to list reconciliations');
  }
}

const createReconciliationSchema = z.object({
  bankAccountId: z.string().min(1),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  statementBalance: z.number(),
});

async function _POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'banking:create');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const body = await request.json();
    const parsed = createReconciliationSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return badRequest('Validation failed', fieldErrors);
    }

    const { bankAccountId, periodStart, periodEnd, statementBalance } = parsed.data;

    // Verify bank account belongs to this company
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id: bankAccountId, companyId, isActive: true },
    });
    if (!bankAccount) {
      return badRequest('Bank account not found');
    }

    // Check for existing in-progress reconciliation
    const existing = await prisma.bankReconciliation.findFirst({
      where: { bankAccountId, status: 'IN_PROGRESS' },
    });
    if (existing) {
      return badRequest('An in-progress reconciliation already exists for this account. Complete or cancel it first.');
    }

    // Calculate opening balance from the last completed reconciliation
    const lastCompleted = await prisma.bankReconciliation.findFirst({
      where: { bankAccountId, status: 'COMPLETED' },
      orderBy: { periodEnd: 'desc' },
    });

    const openingBalance = lastCompleted ? Number(lastCompleted.closingBalance) : Number(bankAccount.currentBalance);

    // Calculate book balance from unreconciled transactions in the period
    const transactions = await prisma.bankTransaction.findMany({
      where: {
        bankAccountId,
        transactionDate: { gte: periodStart, lte: periodEnd },
      },
    });

    const bookBalance = openingBalance + transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const difference = statementBalance - bookBalance;

    const reconciliation = await prisma.bankReconciliation.create({
      data: {
        bankAccountId,
        periodStart,
        periodEnd,
        openingBalance,
        closingBalance: 0, // Will be set on completion
        statementBalance,
        bookBalance,
        difference,
        status: 'IN_PROGRESS',
        reconciledTransactionIds: [],
      },
      include: {
        bankAccount: { select: { id: true, accountName: true, bankName: true } },
      },
    });

    return NextResponse.json(reconciliation, { status: 201 });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to create reconciliation');
  }
}

// Tier-protected exports: Requires 'bank_reconciliation' feature (Starter+)
export const GET = withFeatureCheck('bank_reconciliation', _GET);
export const POST = withFeatureCheck('bank_reconciliation', _POST);
