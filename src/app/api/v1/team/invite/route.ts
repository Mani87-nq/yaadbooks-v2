/**
 * POST /api/v1/team/invite — Invite a user to the company.
 *
 * - If the user already exists, create a CompanyMember record directly.
 * - If the user does not exist, create a PendingInvite record and send
 *   an invite email with a registration link. The invite will be
 *   auto-accepted when the user registers.
 *
 * Security:
 * - Requires `users:create` permission (ADMIN or OWNER only).
 * - Cannot invite someone with a role higher than the inviter's own role.
 * - Enforces plan user-limit via checkPlanLimits.
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod/v4';
import prisma from '@/lib/db';
import { requirePermission, requireCompany } from '@/lib/auth/middleware';
import { badRequest, conflict, forbidden, internalError } from '@/lib/api-error';
import { compareRoles, type Role } from '@/lib/auth/rbac';
import { checkPlanLimits } from '@/lib/billing/service';
import { sendEmail } from '@/lib/email/service';
import { teamInviteEmail } from '@/lib/email/templates';
import { auditUserAction } from '@/lib/audit';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'ACCOUNTANT', 'STAFF', 'READ_ONLY']),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Auth + permission check
    const { user, error: authError } = await requirePermission(request, 'users:create');
    if (authError) return authError;

    // 2. Company scoping
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    // 3. Validate body
    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return badRequest('Validation failed', fieldErrors);
    }

    const { email, role } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // 4. Role hierarchy check — inviter cannot assign a role higher than their own
    const inviterRole = user!.role as Role;
    const targetRole = role as Role;

    if (compareRoles(targetRole, inviterRole) >= 0) {
      return forbidden('Cannot invite a user with a role equal to or higher than your own');
    }

    // OWNER role cannot be assigned through invites
    if (targetRole === 'OWNER') {
      return forbidden('OWNER role cannot be assigned through invitations');
    }

    // 5. Check plan limits (count current members + pending invites)
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { subscriptionPlan: true, businessName: true },
    });

    const planMap: Record<string, string> = {
      STARTER: 'starter',
      BUSINESS: 'business',
      PRO: 'pro',
      ENTERPRISE: 'enterprise',
    };
    const planId = planMap[company?.subscriptionPlan ?? 'STARTER'] ?? 'starter';

    const currentMemberCount = await prisma.companyMember.count({
      where: { companyId },
    });

    const { withinLimits, userLimit } = checkPlanLimits(planId, currentMemberCount + 1, 0);
    if (!withinLimits) {
      return badRequest(
        `Your ${company?.subscriptionPlan ?? 'Starter'} plan allows a maximum of ${userLimit} user(s). Please upgrade your plan to add more team members.`
      );
    }

    // 6. Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (existingUser) {
      // ── User already registered: create CompanyMember directly ──

      // Check if already a member
      const existingMember = await prisma.companyMember.findUnique({
        where: {
          companyId_userId: {
            companyId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMember) {
        return conflict('This user is already a member of your company');
      }

      // Create the membership
      const membership = await prisma.companyMember.create({
        data: {
          companyId,
          userId: existingUser.id,
          role: targetRole,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
              lastLoginAt: true,
              isActive: true,
            },
          },
        },
      });

      // Audit log the user addition (fire-and-forget)
      auditUserAction(
        'USER_JOINED',
        existingUser.id,
        existingUser.email,
        companyId,
        user!.sub,
        {
          role: targetRole,
          membershipId: membership.id,
          inviterRole: inviterRole,
        },
        request
      ).catch(() => {});

      return NextResponse.json(
        {
          data: {
            id: membership.id,
            userId: membership.user.id,
            firstName: membership.user.firstName,
            lastName: membership.user.lastName,
            email: membership.user.email,
            avatarUrl: membership.user.avatarUrl,
            role: membership.role,
            isActive: membership.user.isActive,
            lastLoginAt: membership.user.lastLoginAt,
            joinedAt: membership.createdAt,
          },
          message: `${existingUser.firstName} ${existingUser.lastName} has been added to your team as ${role}.`,
        },
        { status: 201 }
      );
    }

    // ── User does NOT exist: create PendingInvite ──

    // Check if there's already a pending invite for this email
    const existingInvite = await prisma.pendingInvite.findUnique({
      where: { companyId_email: { companyId, email: normalizedEmail } },
    });

    if (existingInvite && !existingInvite.acceptedAt) {
      // Invite still pending — check if expired
      if (existingInvite.expiresAt > new Date()) {
        return conflict('An invitation has already been sent to this email address. It expires ' +
          existingInvite.expiresAt.toLocaleDateString('en-JM', { year: 'numeric', month: 'long', day: 'numeric' }) + '.');
      }
      // Expired — delete and re-create
      await prisma.pendingInvite.delete({ where: { id: existingInvite.id } });
    } else if (existingInvite?.acceptedAt) {
      // Already accepted — check if they're a member
      return conflict('This invitation was already accepted. The user is a member of your company.');
    }

    // Generate secure invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');

    // Create the pending invite (7-day expiry)
    const invite = await prisma.pendingInvite.create({
      data: {
        companyId,
        email: normalizedEmail,
        role: targetRole,
        token: inviteToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        invitedBy: user!.sub,
      },
    });

    // Get inviter name
    const inviter = await prisma.user.findUnique({
      where: { id: user!.sub },
      select: { firstName: true, lastName: true },
    });
    const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}` : 'A team member';

    // Send invite email (fire and forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://yaadbooks.com';
    const inviteLink = `${appUrl}/signup?invite=${inviteToken}`;

    sendEmail({
      to: normalizedEmail,
      ...teamInviteEmail({
        inviterName,
        companyName: company?.businessName ?? 'a company',
        inviteLink,
        role: targetRole,
      }),
    }).catch((err) => console.error('[Invite] Failed to send invite email:', err));

    // Audit log the invitation (fire-and-forget)
    auditUserAction(
      'USER_INVITED',
      invite.id, // Using invite ID since user doesn't exist yet
      normalizedEmail,
      companyId,
      user!.sub,
      {
        role: targetRole,
        inviteId: invite.id,
        inviterRole: inviterRole,
        expiresAt: invite.expiresAt.toISOString(),
      },
      request
    ).catch(() => {});

    return NextResponse.json(
      {
        data: {
          id: invite.id,
          email: normalizedEmail,
          role: targetRole,
          status: 'PENDING',
          expiresAt: invite.expiresAt,
        },
        message: `Invitation sent to ${normalizedEmail}. They will be added as ${role} when they register.`,
      },
      { status: 201 }
    );
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to invite team member');
  }
}
