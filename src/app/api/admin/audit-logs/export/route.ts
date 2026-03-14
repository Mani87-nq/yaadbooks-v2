/**
 * Admin Audit Logs Export API
 * 
 * GET /api/admin/audit-logs/export - Export audit logs as CSV
 * 
 * Query params:
 * - Same filters as the list endpoint
 * - format: 'csv' (default) or 'json'
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUser } from '@/lib/auth/middleware';
import { auditDataExport } from '@/lib/audit';
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') || 'csv';

    // Build where clause
    const where: Prisma.AuditLogWhereInput = {};

    if (action) {
      where.entityType = action;
    }

    if (userId) {
      where.userId = userId;
    }

    if (companyId) {
      where.companyId = companyId;
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

    // Fetch logs (max 10000 for export)
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            businessName: true,
          },
        },
      },
    });

    // Audit the export action
    await auditDataExport(
      'audit_logs',
      authUser.activeCompanyId || 'ADMIN',
      authUser.sub,
      logs.length,
      {
        format,
        filters: { action, userId, companyId, startDate, endDate },
      },
      request
    );

    if (format === 'json') {
      // Return JSON format
      return NextResponse.json({
        exportedAt: new Date().toISOString(),
        recordCount: logs.length,
        logs: logs.map((log) => ({
          id: log.id,
          action: log.entityType,
          enumAction: log.action,
          userId: log.userId,
          userName: log.user
            ? `${log.user.firstName} ${log.user.lastName}`
            : 'System',
          userEmail: log.user?.email,
          companyId: log.companyId,
          companyName: log.company?.businessName,
          entityId: log.entityId,
          metadata: log.newValues,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          reason: log.reason,
          createdAt: log.createdAt.toISOString(),
        })),
      });
    }

    // Generate CSV
    const csvHeaders = [
      'ID',
      'Timestamp',
      'Action',
      'User ID',
      'User Email',
      'User Name',
      'Company ID',
      'Company Name',
      'Entity ID',
      'IP Address',
      'User Agent',
      'Reason',
      'Metadata',
    ];

    const csvRows = logs.map((log) => [
      log.id,
      log.createdAt.toISOString(),
      log.entityType,
      log.userId || '',
      log.user?.email || '',
      log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
      log.companyId || '',
      log.company?.businessName || '',
      log.entityId,
      log.ipAddress || '',
      log.userAgent || '',
      log.reason || '',
      JSON.stringify(log.newValues || {}),
    ]);

    // Escape CSV fields
    const escapeCSV = (field: string | null | undefined): string => {
      if (field === null || field === undefined) return '';
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [
      csvHeaders.map(escapeCSV).join(','),
      ...csvRows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n');

    // Return CSV file
    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[AuditLogs Export API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}
