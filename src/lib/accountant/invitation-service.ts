/**
 * Accountant Client Invitation Service
 *
 * Handles invitation token generation, validation, email sending,
 * and acceptance flow for accountant-client relationships.
 */

import { randomBytes } from 'crypto';
import prisma from '@/lib/db';
import { sendEmail } from '@/lib/email/service';
import {
  accountantInvitationEmail,
  invitationAcceptedEmail,
  invitationResentEmail,
} from '@/lib/email/accountant-templates';

// Token configuration
const TOKEN_BYTES = 32; // 256 bits
const TOKEN_EXPIRY_DAYS = 7;

// Base URL for invitation links
const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

/**
 * Generate a secure random invitation token
 */
export function generateInvitationToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * Calculate token expiry date
 */
export function getTokenExpiryDate(): Date {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + TOKEN_EXPIRY_DAYS);
  return expiryDate;
}

/**
 * Build the invitation acceptance URL
 */
export function buildAcceptUrl(token: string): string {
  return `${getBaseUrl()}/accept-invitation/${token}`;
}

export interface CreateInvitationParams {
  accountantId: string;
  companyId: string;
  invitedEmail: string;
  notes?: string;
  canAccessPayroll?: boolean;
  canAccessBanking?: boolean;
  canExportData?: boolean;
  personalMessage?: string;
}

export interface InvitationResult {
  success: boolean;
  invitation?: {
    id: string;
    status: string;
    invitedEmail: string;
    invitedAt: Date;
    expiresAt: Date;
    company: {
      id: string;
      businessName: string;
    };
  };
  error?: string;
}

/**
 * Create a new accountant-client invitation
 */
export async function createInvitation(
  params: CreateInvitationParams
): Promise<InvitationResult> {
  const {
    accountantId,
    companyId,
    invitedEmail,
    notes,
    canAccessPayroll = true,
    canAccessBanking = true,
    canExportData = true,
    personalMessage,
  } = params;

  try {
    // Get accountant info
    const accountant = await prisma.user.findUnique({
      where: { id: accountantId },
      select: { firstName: true, lastName: true, email: true },
    });

    if (!accountant) {
      return { success: false, error: 'Accountant not found' };
    }

    // Get company and owner info
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        owner: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    // Check for existing relationship
    const existing = await prisma.accountantClient.findUnique({
      where: {
        accountantId_companyId: {
          accountantId,
          companyId,
        },
      },
    });

    if (existing) {
      if (existing.status === 'ACTIVE') {
        return { success: false, error: 'Already connected to this client' };
      }
      if (existing.status === 'PENDING') {
        return { success: false, error: 'Invitation already pending for this client' };
      }
    }

    // Generate token
    const invitationToken = generateInvitationToken();
    const invitationExpiresAt = getTokenExpiryDate();

    // Create or update the relationship
    const invitation = await prisma.accountantClient.upsert({
      where: {
        accountantId_companyId: {
          accountantId,
          companyId,
        },
      },
      create: {
        accountantId,
        companyId,
        invitedEmail,
        status: 'PENDING',
        invitationToken,
        invitationExpiresAt,
        notes,
        canAccessPayroll,
        canAccessBanking,
        canExportData,
      },
      update: {
        invitedEmail,
        status: 'PENDING',
        invitationToken,
        invitationExpiresAt,
        invitedAt: new Date(),
        acceptedAt: null,
        notes,
        canAccessPayroll,
        canAccessBanking,
        canExportData,
      },
      include: {
        company: {
          select: { id: true, businessName: true },
        },
      },
    });

    // Send invitation email
    const accountantName = `${accountant.firstName} ${accountant.lastName}`.trim();
    const ownerName = company.owner
      ? `${company.owner.firstName} ${company.owner.lastName}`.trim()
      : 'Business Owner';
    const recipientEmail = company.owner?.email || invitedEmail;

    const emailContent = accountantInvitationEmail({
      accountantName,
      accountantEmail: accountant.email,
      clientBusinessName: company.businessName,
      clientOwnerName: ownerName,
      acceptUrl: buildAcceptUrl(invitationToken),
      expiresInDays: TOKEN_EXPIRY_DAYS,
      personalMessage,
    });

    await sendEmail({
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return {
      success: true,
      invitation: {
        id: invitation.id,
        status: invitation.status,
        invitedEmail: invitation.invitedEmail || '',
        invitedAt: invitation.invitedAt,
        expiresAt: invitation.invitationExpiresAt!,
        company: invitation.company,
      },
    };
  } catch (error) {
    console.error('[InvitationService] Create invitation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invitation',
    };
  }
}

export interface ValidateTokenResult {
  valid: boolean;
  invitation?: {
    id: string;
    accountantId: string;
    companyId: string;
    status: string;
    accountant: {
      firstName: string;
      lastName: string;
      email: string;
    };
    company: {
      id: string;
      businessName: string;
      email: string | null;
    };
  };
  error?: string;
  errorCode?: 'INVALID' | 'EXPIRED' | 'ALREADY_ACCEPTED' | 'REVOKED';
}

/**
 * Validate an invitation token
 */
export async function validateInvitationToken(
  token: string
): Promise<ValidateTokenResult> {
  try {
    const invitation = await prisma.accountantClient.findFirst({
      where: {
        invitationToken: token,
      },
      include: {
        accountant: {
          select: { firstName: true, lastName: true, email: true },
        },
        company: {
          select: { id: true, businessName: true, email: true },
        },
      },
    });

    if (!invitation) {
      return {
        valid: false,
        error: 'Invitation not found or invalid token',
        errorCode: 'INVALID',
      };
    }

    // Check status
    if (invitation.status === 'ACTIVE') {
      return {
        valid: false,
        error: 'This invitation has already been accepted',
        errorCode: 'ALREADY_ACCEPTED',
      };
    }

    if (invitation.status === 'REVOKED') {
      return {
        valid: false,
        error: 'This invitation has been cancelled',
        errorCode: 'REVOKED',
      };
    }

    // Check expiry
    if (
      invitation.invitationExpiresAt &&
      new Date() > invitation.invitationExpiresAt
    ) {
      return {
        valid: false,
        error: 'This invitation has expired',
        errorCode: 'EXPIRED',
      };
    }

    return {
      valid: true,
      invitation: {
        id: invitation.id,
        accountantId: invitation.accountantId,
        companyId: invitation.companyId,
        status: invitation.status,
        accountant: invitation.accountant,
        company: invitation.company,
      },
    };
  } catch (error) {
    console.error('[InvitationService] Validate token failed:', error);
    return {
      valid: false,
      error: 'Failed to validate invitation',
      errorCode: 'INVALID',
    };
  }
}

export interface AcceptInvitationResult {
  success: boolean;
  error?: string;
}

/**
 * Accept an invitation and activate the accountant-client relationship
 */
export async function acceptInvitation(
  token: string,
  acceptingUserId: string
): Promise<AcceptInvitationResult> {
  try {
    // Validate token first
    const validation = await validateInvitationToken(token);
    if (!validation.valid || !validation.invitation) {
      return { success: false, error: validation.error };
    }

    const { invitation } = validation;

    // Verify the accepting user has access to the company
    const companyMember = await prisma.companyMember.findFirst({
      where: {
        companyId: invitation.companyId,
        userId: acceptingUserId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!companyMember) {
      return {
        success: false,
        error: 'You must be an owner or admin of the company to accept this invitation',
      };
    }

    // Update the invitation status
    const updatedInvitation = await prisma.accountantClient.update({
      where: { id: invitation.id },
      data: {
        status: 'ACTIVE',
        acceptedAt: new Date(),
        invitationToken: null, // Clear token after use
        invitationExpiresAt: null,
      },
      include: {
        accountant: {
          select: { firstName: true, lastName: true, email: true },
        },
        company: {
          select: { businessName: true },
        },
      },
    });

    // Get accepting user details
    const acceptingUser = await prisma.user.findUnique({
      where: { id: acceptingUserId },
      select: { firstName: true, lastName: true, email: true },
    });

    // Send notification email to accountant
    if (acceptingUser) {
      const accountantName = `${updatedInvitation.accountant.firstName} ${updatedInvitation.accountant.lastName}`.trim();
      const clientOwnerName = `${acceptingUser.firstName} ${acceptingUser.lastName}`.trim();

      const emailContent = invitationAcceptedEmail({
        accountantName,
        clientBusinessName: updatedInvitation.company.businessName,
        clientOwnerName,
        clientEmail: acceptingUser.email,
        dashboardUrl: `${getBaseUrl()}/accountant`,
      });

      await sendEmail({
        to: updatedInvitation.accountant.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('[InvitationService] Accept invitation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to accept invitation',
    };
  }
}

/**
 * Resend an invitation email with a new token
 */
export async function resendInvitation(
  invitationId: string,
  accountantId: string
): Promise<InvitationResult> {
  try {
    // Get the existing invitation
    const existing = await prisma.accountantClient.findFirst({
      where: {
        id: invitationId,
        accountantId,
        status: 'PENDING',
      },
      include: {
        accountant: {
          select: { firstName: true, lastName: true, email: true },
        },
        company: {
          include: {
            owner: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!existing) {
      return { success: false, error: 'Invitation not found or not pending' };
    }

    // Generate new token
    const invitationToken = generateInvitationToken();
    const invitationExpiresAt = getTokenExpiryDate();

    // Update invitation
    const invitation = await prisma.accountantClient.update({
      where: { id: invitationId },
      data: {
        invitationToken,
        invitationExpiresAt,
        invitedAt: new Date(), // Reset invited date
      },
      include: {
        company: {
          select: { id: true, businessName: true },
        },
      },
    });

    // Send email
    const accountantName = `${existing.accountant.firstName} ${existing.accountant.lastName}`.trim();
    const ownerName = existing.company.owner
      ? `${existing.company.owner.firstName} ${existing.company.owner.lastName}`.trim()
      : 'Business Owner';
    const recipientEmail = existing.company.owner?.email || existing.invitedEmail;

    if (recipientEmail) {
      const emailContent = invitationResentEmail({
        accountantName,
        accountantEmail: existing.accountant.email,
        clientBusinessName: existing.company.businessName,
        clientOwnerName: ownerName,
        acceptUrl: buildAcceptUrl(invitationToken),
        expiresInDays: TOKEN_EXPIRY_DAYS,
      });

      await sendEmail({
        to: recipientEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    }

    return {
      success: true,
      invitation: {
        id: invitation.id,
        status: invitation.status,
        invitedEmail: invitation.invitedEmail || '',
        invitedAt: invitation.invitedAt,
        expiresAt: invitation.invitationExpiresAt!,
        company: invitation.company,
      },
    };
  } catch (error) {
    console.error('[InvitationService] Resend invitation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resend invitation',
    };
  }
}

/**
 * Cancel a pending invitation
 */
export async function cancelInvitation(
  invitationId: string,
  accountantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.accountantClient.findFirst({
      where: {
        id: invitationId,
        accountantId,
        status: 'PENDING',
      },
    });

    if (!existing) {
      return { success: false, error: 'Invitation not found or not pending' };
    }

    await prisma.accountantClient.update({
      where: { id: invitationId },
      data: {
        status: 'REVOKED',
        invitationToken: null,
        invitationExpiresAt: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[InvitationService] Cancel invitation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel invitation',
    };
  }
}

/**
 * Get pending invitations for an accountant
 */
export async function getPendingInvitations(accountantId: string) {
  return prisma.accountantClient.findMany({
    where: {
      accountantId,
      status: 'PENDING',
    },
    include: {
      company: {
        select: {
          id: true,
          businessName: true,
          email: true,
          phone: true,
          industry: true,
        },
      },
    },
    orderBy: { invitedAt: 'desc' },
  });
}
