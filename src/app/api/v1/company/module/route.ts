/**
 * Company Module Selection API
 *
 * POST /api/v1/company/module
 * Sets the industry module for the user's active company.
 * This is a one-time operation (permanent selection).
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import prisma from '@/lib/db';
import {
  setSelectedModule,
  isValidModule,
  getModuleDefinition,
  type IndustryModule,
} from '@/lib/modules/module-access';

interface ModuleSelectRequest {
  module: string;
}

// =============================================================================
// GET - Get current module selection
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : request.cookies.get('accessToken')?.value;

    if (!token) {
      return NextResponse.json(
        { type: 'unauthorized', title: 'Authentication required', status: 401 },
        { status: 401 }
      );
    }

    let userId: string;
    let activeCompanyId: string | null;
    try {
      const payload = await verifyAccessToken(token);
      userId = payload.sub;
      activeCompanyId = payload.activeCompanyId;
    } catch {
      return NextResponse.json(
        { type: 'unauthorized', title: 'Invalid token', status: 401 },
        { status: 401 }
      );
    }

    // Get company
    const company = activeCompanyId
      ? await prisma.company.findUnique({
          where: { id: activeCompanyId },
          select: {
            id: true,
            selectedModule: true,
            subscriptionPlan: true,
          },
        })
      : null;

    if (!company) {
      return NextResponse.json(
        { type: 'not_found', title: 'Company not found', status: 404 },
        { status: 404 }
      );
    }

    const tier = (company.subscriptionPlan || 'FREE').toLowerCase();
    const hasModuleAccess = ['professional', 'business', 'enterprise'].includes(tier);

    // Return current state
    return NextResponse.json({
      selectedModule: company.selectedModule?.toLowerCase() || null,
      tier,
      hasModuleAccess,
      needsSelection: hasModuleAccess && !company.selectedModule && tier !== 'enterprise',
    });
  } catch (error) {
    console.error('[GET /api/v1/company/module] Error:', error);
    return NextResponse.json(
      {
        type: 'internal_error',
        title: 'Internal server error',
        status: 500,
        detail: 'Failed to fetch module information',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Select a module
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : request.cookies.get('accessToken')?.value;

    if (!token) {
      return NextResponse.json(
        { type: 'unauthorized', title: 'Authentication required', status: 401 },
        { status: 401 }
      );
    }

    let userId: string;
    let activeCompanyId: string | null;
    try {
      const payload = await verifyAccessToken(token);
      userId = payload.sub;
      activeCompanyId = payload.activeCompanyId;
    } catch {
      return NextResponse.json(
        { type: 'unauthorized', title: 'Invalid token', status: 401 },
        { status: 401 }
      );
    }

    // Parse request body
    let body: ModuleSelectRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          type: 'bad_request',
          title: 'Invalid request body',
          status: 400,
          detail: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    const { module } = body;

    // Validate module
    if (!module || typeof module !== 'string') {
      return NextResponse.json(
        {
          type: 'bad_request',
          title: 'Module required',
          status: 400,
          detail: 'Please provide a module to select',
        },
        { status: 400 }
      );
    }

    const normalizedModule = module.toLowerCase();

    if (!isValidModule(normalizedModule)) {
      return NextResponse.json(
        {
          type: 'bad_request',
          title: 'Invalid module',
          status: 400,
          detail: 'Module must be one of: retail, restaurant, salon',
        },
        { status: 400 }
      );
    }

    if (!activeCompanyId) {
      return NextResponse.json(
        {
          type: 'bad_request',
          title: 'No active company',
          status: 400,
          detail: 'Please select a company first',
        },
        { status: 400 }
      );
    }

    // Set the module
    const result = await setSelectedModule(
      activeCompanyId,
      userId,
      normalizedModule as IndustryModule,
      request
    );

    if (!result.success) {
      return NextResponse.json(
        {
          type: 'bad_request',
          title: 'Failed to select module',
          status: 400,
          detail: result.error,
        },
        { status: 400 }
      );
    }

    // Get module definition for response
    const moduleDefinition = getModuleDefinition(normalizedModule as IndustryModule);

    return NextResponse.json({
      success: true,
      module: {
        id: moduleDefinition.id,
        name: moduleDefinition.name,
        description: moduleDefinition.description,
        features: moduleDefinition.features,
        routes: moduleDefinition.routes,
      },
      message: `${moduleDefinition.name} module activated successfully`,
    });
  } catch (error) {
    console.error('[POST /api/v1/company/module] Error:', error);
    return NextResponse.json(
      {
        type: 'internal_error',
        title: 'Internal server error',
        status: 500,
        detail: 'Failed to set module',
      },
      { status: 500 }
    );
  }
}
