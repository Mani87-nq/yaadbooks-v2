/**
 * GET/PUT/DELETE /api/v1/employees/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import prisma from '@/lib/db';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { notFound, badRequest, internalError } from '@/lib/api-error';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await requirePermission(request, 'payroll:read');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const employee = await prisma.employee.findFirst({
      where: { id, companyId: companyId!, deletedAt: null },
      include: { payrollEntries: { take: 10, orderBy: { payrollRunId: 'desc' } } },
    });
    if (!employee) return notFound('Employee not found');
    return NextResponse.json(employee);
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to get employee');
  }
}

const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  position: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  baseSalary: z.number().positive().optional(),
  paymentFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
  isActive: z.boolean().optional(),
  bankName: z.string().max(100).optional(),
  bankAccountNumber: z.string().max(50).optional(),
});

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await requirePermission(request, 'payroll:update');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const existing = await prisma.employee.findFirst({ where: { id, companyId: companyId!, deletedAt: null } });
    if (!existing) return notFound('Employee not found');

    const body = await request.json();
    const parsed = updateEmployeeSchema.safeParse(body);
    if (!parsed.success) return badRequest('Validation failed');

    const employee = await prisma.employee.update({
      where: { id },
      data: { ...parsed.data, email: parsed.data.email || null },
    });
    return NextResponse.json(employee);
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to update employee');
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { user, error: authError } = await requirePermission(request, 'payroll:delete');
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const existing = await prisma.employee.findFirst({ where: { id, companyId: companyId!, deletedAt: null } });
    if (!existing) return notFound('Employee not found');

    await prisma.employee.update({ where: { id }, data: { deletedAt: new Date() } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to delete employee');
  }
}
