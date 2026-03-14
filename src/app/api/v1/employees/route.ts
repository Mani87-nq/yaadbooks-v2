/**
 * GET/POST /api/v1/employees
 *
 * TIER PROTECTED: Requires 'employee_portal' feature (Professional+)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import prisma from '@/lib/db';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { badRequest, internalError } from '@/lib/api-error';
import { withFeatureCheck } from '@/lib/tier';

async function _GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'payroll:read');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const isActive = searchParams.get('active') !== 'false';

    const employees = await prisma.employee.findMany({
      where: { companyId: companyId!, isActive, deletedAt: null },
      take: limit,
      orderBy: { lastName: 'asc' },
    });

    return NextResponse.json({ data: employees });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to list employees');
  }
}

/**
 * Accept both lowercase (from frontend selects) and uppercase enum values.
 */
const flexEnum = (values: readonly [string, ...string[]]) =>
  z.string().transform((v) => v.toUpperCase()).pipe(z.enum(values as any) as any);

const createEmployeeSchema = z.object({
  employeeNumber: z.string().min(1).max(20).optional(), // Auto-generated if omitted
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  position: z.string().min(1).max(100),
  department: z.string().max(100).optional(),
  employmentType: flexEnum(['FULL_TIME', 'PART_TIME', 'CONTRACT'] as const).default('FULL_TIME'),
  paymentFrequency: flexEnum(['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const).default('MONTHLY'),
  baseSalary: z.number().min(0),
  trnNumber: z.string().max(20).optional().or(z.literal('')),
  nisNumber: z.string().max(20).optional().or(z.literal('')),
  dateOfBirth: z.coerce.date().optional(),
  hireDate: z.coerce.date(),
  bankName: z.string().max(100).optional(),
  bankAccountNumber: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
});

async function _POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requirePermission(request, 'payroll:create');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const body = await request.json();
    const parsed = createEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return badRequest('Validation failed', fieldErrors);
    }

    // Auto-generate employee number if not provided
    let employeeNumber = parsed.data.employeeNumber;
    if (!employeeNumber) {
      employeeNumber = `EMP-${Date.now().toString(36).toUpperCase()}`;
    }

    const { dateOfBirth, ...restData } = parsed.data;
    const employee = await prisma.employee.create({
      data: {
        ...restData,
        employeeNumber,
        email: restData.email || null,
        trnNumber: restData.trnNumber || '',
        nisNumber: restData.nisNumber || '',
        ...(dateOfBirth ? { dateOfBirth } : {}),
        companyId: companyId!,
        createdBy: user!.sub,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to create employee');
  }
}

// Tier-protected exports: Requires 'employee_portal' feature (Professional+)
export const GET = withFeatureCheck('employee_portal', _GET);
export const POST = withFeatureCheck('employee_portal', _POST);
