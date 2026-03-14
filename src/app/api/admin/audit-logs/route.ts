/**
 * Admin Audit Logs API
 * 
 * GET /api/admin/audit-logs - List audit logs with filtering
 * 
 * Query params:
 * - action: Filter by specific action type
 * - userId: Filter by user ID
 * - companyId: Filter by company ID
 * - entityType: Filter by entity type
 * - startDate: Filter from date (ISO string)
 * - endDate: Filter to date (ISO string)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUser } from '@/lib/auth/middleware';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Verify admin session
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin role
    if (!['OWNER', 'ADMIN'].includes(authUser.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const companyId = searchParams.get('companyId');
    const entityType = searchParams.get('entityType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.AuditLogWhereInput = {};

    if (action) {
      where.entityType = action; // We store tier action type in entityType
    }

    if (userId) {
      where.userId = userId;
    }

    if (companyId) {
      where.companyId = companyId;
    }

    if (entityType && !action) {
      // If action is not specified, use entityType for filtering
      where.entityType = entityType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Fetch logs with pagination
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          company: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Transform logs for response
    const transformedLogs = logs.map((log) => ({
      id: log.id,
      action: log.entityType, // Tier action type
      enumAction: log.action, // Generic AuditAction enum
      userId: log.userId,
      userName: log.user
        ? `${log.user.firstName} ${log.user.lastName}`
        : 'System',
      userEmail: log.user?.email || null,
      companyId: log.companyId,
      companyName: log.company?.businessName || null,
      entityId: log.entityId,
      metadata: log.newValues,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      reason: log.reason,
      notes: log.notes,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      logs: transformedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('[AuditLogs API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
