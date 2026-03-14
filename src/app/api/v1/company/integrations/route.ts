/**
 * GET  /api/v1/company/integrations — Load integration settings for the active company
 * PATCH /api/v1/company/integrations — Update integration settings (partial merge)
 *
 * Stores settings in Company.integrationSettings (JSON field).
 * Shape: { wipay?, email?, ai?, stripe?, quickbooks?, xero?, mailchimp?, twilio? }
 *
 * API keys are encrypted at rest with AES-256-GCM.
 * On GET, keys are masked (only last 8 chars returned).
 *
 * TIER PROTECTED: Requires 'custom_integrations' feature (Enterprise)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import prisma from '@/lib/db';
import { requireAuth, requireCompany } from '@/lib/auth/middleware';
import { badRequest, internalError } from '@/lib/api-error';
import { encrypt, decrypt } from '@/lib/encryption';
import { maskApiKey } from '@/lib/ai/providers';
import { withFeatureCheck } from '@/lib/tier';

// ─── Types ──────────────────────────────────────────────────────

interface WiPaySettings {
  accountNumber: string;
  apiKey: string;
  feeStructure: 'merchant' | 'customer';
  environment: 'sandbox' | 'live';
}

interface EmailSettings {
  fromAddress: string;
  configured: boolean;
}

interface AIProviderSettings {
  apiKey?: string;       // Encrypted at rest
  enabled: boolean;
  addedAt?: string;      // ISO timestamp
}

interface AISettings {
  configured: boolean;
  providers?: {
    anthropic?: AIProviderSettings;
    openai?: AIProviderSettings;
    google?: AIProviderSettings;
  };
  defaultProvider?: 'anthropic' | 'openai' | 'google';
  advancedFeaturesEnabled?: boolean;
}

interface StripeSettings {
  publishableKey: string;
  secretKey: string;      // Encrypted
  webhookSecret: string;  // Encrypted
  enabled: boolean;
}

interface QuickBooksSettings {
  connected: boolean;
  realmId?: string;
  accessToken?: string;   // Encrypted
  refreshToken?: string;  // Encrypted
  lastSync?: string;
}

interface XeroSettings {
  connected: boolean;
  tenantId?: string;
  accessToken?: string;   // Encrypted
  refreshToken?: string;  // Encrypted
  lastSync?: string;
}

interface MailchimpSettings {
  apiKey: string;         // Encrypted
  listId?: string;
  syncCustomers: boolean;
  enabled: boolean;
}

interface TwilioSettings {
  accountSid: string;     // Encrypted
  authToken: string;      // Encrypted
  phoneNumber: string;
  enabled: boolean;
}

interface IntegrationSettings {
  wipay?: WiPaySettings;
  email?: EmailSettings;
  ai?: AISettings;
  stripe?: StripeSettings;
  quickbooks?: QuickBooksSettings;
  xero?: XeroSettings;
  mailchimp?: MailchimpSettings;
  twilio?: TwilioSettings;
}

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Mask AI provider keys for GET response.
 * Returns full settings but with API keys masked.
 */
function maskAISettings(ai: AISettings): AISettings {
  const masked = { ...ai };
  if (masked.providers) {
    const providers = { ...masked.providers };
    for (const key of ['anthropic', 'openai', 'google'] as const) {
      if (providers[key]?.apiKey) {
        try {
          const decrypted = decrypt(providers[key]!.apiKey!);
          providers[key] = { ...providers[key]!, apiKey: maskApiKey(decrypted) };
        } catch {
          // If decryption fails, just mask the stored value
          providers[key] = { ...providers[key]!, apiKey: '***encrypted***' };
        }
      }
    }
    masked.providers = providers;
  }
  return masked;
}

/**
 * Mask general settings for GET response.
 */
function maskSettings(settings: IntegrationSettings): IntegrationSettings {
  const masked = { ...settings };

  // Mask AI keys
  if (masked.ai) {
    masked.ai = maskAISettings(masked.ai);
  }

  // Mask Stripe keys
  if (masked.stripe?.secretKey) {
    try {
      const decrypted = decrypt(masked.stripe.secretKey);
      masked.stripe = { ...masked.stripe, secretKey: maskApiKey(decrypted) };
    } catch {
      masked.stripe = { ...masked.stripe, secretKey: '***encrypted***' };
    }
  }
  if (masked.stripe?.webhookSecret) {
    try {
      const decrypted = decrypt(masked.stripe.webhookSecret);
      masked.stripe = { ...masked.stripe, webhookSecret: maskApiKey(decrypted) };
    } catch {
      masked.stripe = { ...masked.stripe, webhookSecret: '***encrypted***' };
    }
  }

  // Mask Mailchimp key
  if (masked.mailchimp?.apiKey) {
    try {
      const decrypted = decrypt(masked.mailchimp.apiKey);
      masked.mailchimp = { ...masked.mailchimp, apiKey: maskApiKey(decrypted) };
    } catch {
      masked.mailchimp = { ...masked.mailchimp, apiKey: '***encrypted***' };
    }
  }

  // Mask Twilio credentials
  if (masked.twilio?.accountSid) {
    try {
      const decrypted = decrypt(masked.twilio.accountSid);
      masked.twilio = { ...masked.twilio, accountSid: maskApiKey(decrypted) };
    } catch {
      masked.twilio = { ...masked.twilio, accountSid: '***encrypted***' };
    }
  }
  if (masked.twilio?.authToken) {
    try {
      const decrypted = decrypt(masked.twilio.authToken);
      masked.twilio = { ...masked.twilio, authToken: maskApiKey(decrypted) };
    } catch {
      masked.twilio = { ...masked.twilio, authToken: '***encrypted***' };
    }
  }

  // QuickBooks/Xero tokens are never returned
  if (masked.quickbooks) {
    masked.quickbooks = {
      connected: masked.quickbooks.connected,
      realmId: masked.quickbooks.realmId,
      lastSync: masked.quickbooks.lastSync,
    };
  }
  if (masked.xero) {
    masked.xero = {
      connected: masked.xero.connected,
      tenantId: masked.xero.tenantId,
      lastSync: masked.xero.lastSync,
    };
  }

  return masked;
}

// ─── GET ────────────────────────────────────────────────────────

async function _GET(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(request);
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const company = await prisma.company.findUnique({
      where: { id: companyId! },
      select: { integrationSettings: true, email: true },
    });

    if (!company) {
      return NextResponse.json({} as IntegrationSettings);
    }

    const stored = (company.integrationSettings as IntegrationSettings | null) ?? {};

    // Build response — merge stored settings with defaults
    const settings: IntegrationSettings = {
      wipay: stored.wipay ?? {
        accountNumber: '',
        apiKey: '',
        feeStructure: 'merchant',
        environment: 'sandbox',
      },
      email: stored.email ?? {
        fromAddress: company.email ?? '',
        configured: false,
      },
      ai: stored.ai ?? {
        configured: false,
        providers: {},
        defaultProvider: 'anthropic',
        advancedFeaturesEnabled: false,
      },
      stripe: stored.stripe ?? {
        publishableKey: '',
        secretKey: '',
        webhookSecret: '',
        enabled: false,
      },
      quickbooks: stored.quickbooks ?? {
        connected: false,
      },
      xero: stored.xero ?? {
        connected: false,
      },
      mailchimp: stored.mailchimp ?? {
        apiKey: '',
        syncCustomers: false,
        enabled: false,
      },
      twilio: stored.twilio ?? {
        accountSid: '',
        authToken: '',
        phoneNumber: '',
        enabled: false,
      },
    };

    // Mask all API keys before returning
    return NextResponse.json(maskSettings(settings));
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to load integrations');
  }
}

// ─── PATCH ──────────────────────────────────────────────────────

const wipaySchema = z.object({
  accountNumber: z.string().max(100).optional(),
  apiKey: z.string().max(500).optional(),
  feeStructure: z.enum(['merchant', 'customer']).optional(),
  environment: z.enum(['sandbox', 'live']).optional(),
}).optional();

const emailSchema = z.object({
  fromAddress: z.string().email().max(200).optional(),
  configured: z.boolean().optional(),
}).optional();

const aiProviderSchema = z.object({
  apiKey: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
}).optional();

const aiSchema = z.object({
  configured: z.boolean().optional(),
  providers: z.object({
    anthropic: aiProviderSchema,
    openai: aiProviderSchema,
    google: aiProviderSchema,
  }).optional(),
  defaultProvider: z.enum(['anthropic', 'openai', 'google']).optional(),
}).optional();

const stripeSchema = z.object({
  publishableKey: z.string().max(500).optional(),
  secretKey: z.string().max(500).optional(),
  webhookSecret: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
}).optional();

const mailchimpSchema = z.object({
  apiKey: z.string().max(500).optional(),
  listId: z.string().max(200).optional(),
  syncCustomers: z.boolean().optional(),
  enabled: z.boolean().optional(),
}).optional();

const twilioSchema = z.object({
  accountSid: z.string().max(200).optional(),
  authToken: z.string().max(500).optional(),
  phoneNumber: z.string().max(50).optional(),
  enabled: z.boolean().optional(),
}).optional();

const patchSchema = z.object({
  wipay: wipaySchema,
  email: emailSchema,
  ai: aiSchema,
  stripe: stripeSchema,
  mailchimp: mailchimpSchema,
  twilio: twilioSchema,
});

/**
 * Check if a value looks like a masked key (from GET response).
 * Masked keys should NOT be saved — they indicate the user didn't change the key.
 */
function isMaskedKey(value: string | undefined): boolean {
  if (!value) return false;
  return value.includes('...') || value === '***encrypted***' || value === '***';
}

async function _PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(request);
    if (authError) return authError;
    const { companyId, error: companyError } = requireCompany(user!);
    if (companyError) return companyError;

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest('Invalid integration settings');
    }

    // Load existing settings
    const company = await prisma.company.findUnique({
      where: { id: companyId! },
      select: { integrationSettings: true },
    });

    const existing = (company?.integrationSettings as IntegrationSettings | null) ?? {};

    // Deep merge incoming data with existing settings
    const updated: IntegrationSettings = { ...existing };

    // ── WiPay ──
    if (parsed.data.wipay) {
      updated.wipay = {
        accountNumber: parsed.data.wipay.accountNumber ?? existing.wipay?.accountNumber ?? '',
        apiKey: parsed.data.wipay.apiKey ?? existing.wipay?.apiKey ?? '',
        feeStructure: parsed.data.wipay.feeStructure ?? existing.wipay?.feeStructure ?? 'merchant',
        environment: parsed.data.wipay.environment ?? existing.wipay?.environment ?? 'sandbox',
      };
    }

    // ── Email ──
    if (parsed.data.email) {
      updated.email = {
        fromAddress: parsed.data.email.fromAddress ?? existing.email?.fromAddress ?? '',
        configured: parsed.data.email.configured ?? existing.email?.configured ?? false,
      };
    }

    // ── AI (with encryption) ──
    if (parsed.data.ai) {
      const existingAi = existing.ai as AISettings | undefined;
      const newAi: AISettings = {
        configured: parsed.data.ai.configured ?? existingAi?.configured ?? false,
        providers: { ...existingAi?.providers },
        defaultProvider: parsed.data.ai.defaultProvider ?? existingAi?.defaultProvider ?? 'anthropic',
        advancedFeaturesEnabled: existingAi?.advancedFeaturesEnabled ?? false,
      };

      // Process each provider's API key
      if (parsed.data.ai.providers) {
        for (const providerName of ['anthropic', 'openai', 'google'] as const) {
          const incoming = parsed.data.ai.providers[providerName];
          if (incoming) {
            const existingProvider = existingAi?.providers?.[providerName];
            const newProvider: AIProviderSettings = {
              enabled: incoming.enabled ?? existingProvider?.enabled ?? false,
              addedAt: existingProvider?.addedAt,
            };

            // Only encrypt and store if it's a new real key (not masked)
            if (incoming.apiKey && !isMaskedKey(incoming.apiKey)) {
              newProvider.apiKey = encrypt(incoming.apiKey);
              newProvider.addedAt = new Date().toISOString();
            } else {
              // Keep existing encrypted key
              newProvider.apiKey = existingProvider?.apiKey;
            }

            if (!newAi.providers) newAi.providers = {};
            newAi.providers[providerName] = newProvider;
          }
        }
      }

      // Auto-set configured and advancedFeaturesEnabled
      const hasAnyKey = Object.values(newAi.providers || {}).some(p => p?.apiKey && p.enabled);
      newAi.configured = hasAnyKey || !!process.env.ANTHROPIC_API_KEY;
      newAi.advancedFeaturesEnabled = hasAnyKey; // Advanced features require user's own key

      updated.ai = newAi;
    }

    // ── Stripe (with encryption) ──
    if (parsed.data.stripe) {
      const existingStripe = existing.stripe;
      updated.stripe = {
        publishableKey: parsed.data.stripe.publishableKey ?? existingStripe?.publishableKey ?? '',
        secretKey: (() => {
          if (parsed.data.stripe!.secretKey && !isMaskedKey(parsed.data.stripe!.secretKey)) {
            return encrypt(parsed.data.stripe!.secretKey);
          }
          return existingStripe?.secretKey ?? '';
        })(),
        webhookSecret: (() => {
          if (parsed.data.stripe!.webhookSecret && !isMaskedKey(parsed.data.stripe!.webhookSecret)) {
            return encrypt(parsed.data.stripe!.webhookSecret);
          }
          return existingStripe?.webhookSecret ?? '';
        })(),
        enabled: parsed.data.stripe.enabled ?? existingStripe?.enabled ?? false,
      };
    }

    // ── Mailchimp (with encryption) ──
    if (parsed.data.mailchimp) {
      const existingMc = existing.mailchimp;
      updated.mailchimp = {
        apiKey: (() => {
          if (parsed.data.mailchimp!.apiKey && !isMaskedKey(parsed.data.mailchimp!.apiKey)) {
            return encrypt(parsed.data.mailchimp!.apiKey);
          }
          return existingMc?.apiKey ?? '';
        })(),
        listId: parsed.data.mailchimp.listId ?? existingMc?.listId,
        syncCustomers: parsed.data.mailchimp.syncCustomers ?? existingMc?.syncCustomers ?? false,
        enabled: parsed.data.mailchimp.enabled ?? existingMc?.enabled ?? false,
      };
    }

    // ── Twilio (with encryption) ──
    if (parsed.data.twilio) {
      const existingTwilio = existing.twilio;
      updated.twilio = {
        accountSid: (() => {
          if (parsed.data.twilio!.accountSid && !isMaskedKey(parsed.data.twilio!.accountSid)) {
            return encrypt(parsed.data.twilio!.accountSid);
          }
          return existingTwilio?.accountSid ?? '';
        })(),
        authToken: (() => {
          if (parsed.data.twilio!.authToken && !isMaskedKey(parsed.data.twilio!.authToken)) {
            return encrypt(parsed.data.twilio!.authToken);
          }
          return existingTwilio?.authToken ?? '';
        })(),
        phoneNumber: parsed.data.twilio.phoneNumber ?? existingTwilio?.phoneNumber ?? '',
        enabled: parsed.data.twilio.enabled ?? existingTwilio?.enabled ?? false,
      };
    }

    // Save to database
    await prisma.company.update({
      where: { id: companyId! },
      data: { integrationSettings: updated as any },
    });

    // Return masked version
    return NextResponse.json(maskSettings(updated));
  } catch (error) {
    return internalError(error instanceof Error ? error.message : 'Failed to update integrations');
  }
}

// Tier-protected exports: Requires 'custom_integrations' feature (Enterprise)
export const GET = withFeatureCheck('custom_integrations', _GET);
export const PATCH = withFeatureCheck('custom_integrations', _PATCH);
