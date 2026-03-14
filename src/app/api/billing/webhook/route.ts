import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import prisma from '@/lib/db';
import { migrateLegacyPlanId } from '@/lib/billing/service';
import { handlePaymentFailed, clearPaymentFailure } from '@/lib/billing/payment-failure';
import { handleUpgradeRestore } from '@/lib/billing/downgrade';
import { auditTierChange, auditPaymentFailed } from '@/lib/audit';

// Stripe webhook handler for subscription events
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // Verify Stripe signature (HMAC-SHA256)
  let event;
  try {
    event = verifyStripeSignature(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // ── Idempotency check ──────────────────────────────────────────────
  // Stripe may deliver the same event multiple times. We track each
  // event ID so duplicate deliveries are safely ignored.
  const eventId: string | undefined = event.id;
  if (eventId) {
    const existing = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
    if (existing) {
      // Already processed — acknowledge without re-processing
      console.log(`Duplicate webhook event ignored: ${eventId}`);
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { companyId, userId, planId, billingInterval } = session.metadata || {};
        if (companyId && planId) {
          // Normalize plan ID to new tier structure
          const normalizedPlan = migrateLegacyPlanId(planId);
          const dbPlan = normalizedPlan.toUpperCase() as any;

          // Get accurate subscription period end from Stripe
          let subscriptionEndDate: Date | null = null;
          const subscriptionId = session.subscription;
          if (subscriptionId) {
            try {
              const stripeKey = process.env.STRIPE_SECRET_KEY;
              if (stripeKey) {
                const subResponse = await fetch(
                  `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
                  {
                    headers: { 'Authorization': `Bearer ${stripeKey}` },
                  }
                );
                if (subResponse.ok) {
                  const subData = await subResponse.json();
                  if (subData.current_period_end) {
                    subscriptionEndDate = new Date(subData.current_period_end * 1000);
                  }
                }
              }
            } catch {
              console.error(`Failed to fetch subscription ${subscriptionId} from Stripe`);
            }

            // Fallback: use billing interval from metadata
            if (!subscriptionEndDate) {
              const days = billingInterval === 'year' ? 365 : 30;
              subscriptionEndDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
            }
          }

          await prisma.company.update({
            where: { id: companyId },
            data: {
              subscriptionPlan: dbPlan,
              subscriptionStatus: 'ACTIVE',
              stripeCustomerId: session.customer ?? null,
              stripeSubscriptionId: subscriptionId ?? null,
              subscriptionEndDate,
              // Clear any payment failure state on successful checkout
              paymentFailedAt: null,
              gracePeriodNotified: false,
            },
          });

          // Restore features if upgrading (e.g., re-enable API keys)
          const { restoredApiKeys } = await handleUpgradeRestore(companyId, normalizedPlan);
          if (restoredApiKeys > 0) {
            console.log(`Checkout completed - Company: ${companyId}, Plan: ${normalizedPlan}, Restored ${restoredApiKeys} API keys`);
          } else {
            console.log(`Checkout completed - Company: ${companyId}, Plan: ${normalizedPlan} (raw: ${planId})`);
          }

          // Audit log the tier change (fire-and-forget)
          auditTierChange(
            'TIER_UPGRADED',
            companyId,
            userId || 'system',
            planId,
            normalizedPlan,
            {
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: session.customer,
              billingInterval,
              subscriptionEndDate: subscriptionEndDate?.toISOString(),
            }
          ).catch(() => {});
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const company = await prisma.company.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (company) {
          await prisma.company.update({
            where: { id: company.id },
            data: {
              subscriptionStatus: mapStripeStatus(subscription.status),
              subscriptionEndDate: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : null,
            },
          });
          console.log(`Subscription updated - Company: ${company.id}, Status: ${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const company = await prisma.company.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (company) {
          const previousPlan = company.subscriptionPlan;
          await prisma.company.update({
            where: { id: company.id },
            data: {
              subscriptionStatus: 'CANCELLED' as const,
              subscriptionPlan: 'FREE' as const,
            },
          });
          console.log(`Subscription cancelled - Company: ${company.id}`);

          // Audit log the tier downgrade (fire-and-forget)
          auditTierChange(
            'TIER_DOWNGRADED',
            company.id,
            'system',
            previousPlan || 'unknown',
            'FREE',
            {
              reason: 'subscription_cancelled',
              stripeSubscriptionId: subscription.id,
            }
          ).catch(() => {});
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const company = await prisma.company.findFirst({
          where: { stripeCustomerId: invoice.customer },
        });
        if (company) {
          // Use the payment failure handler for proper grace period tracking
          const result = await handlePaymentFailed(company.id, invoice.id);
          console.log(`Payment failed - Company: ${company.id}, Result: ${result.action}`);

          // Audit log the payment failure (fire-and-forget)
          auditPaymentFailed(
            company.id,
            null, // No specific user for webhook events
            result.action || 'payment_failed',
            {
              stripeInvoiceId: invoice.id,
              stripeCustomerId: invoice.customer,
              action: result.action,
            }
          ).catch(() => {});
        }
        break;
      }

      case 'invoice.paid': {
        // Payment succeeded - clear any payment failure state
        const invoice = event.data.object;
        const company = await prisma.company.findFirst({
          where: { stripeCustomerId: invoice.customer },
        });
        if (company) {
          await clearPaymentFailure(company.id);
          console.log(`Payment succeeded - Company: ${company.id}, failure state cleared`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // ── Record event as processed ──────────────────────────────────────
    if (eventId) {
      await prisma.webhookEvent.create({
        data: { id: eventId, source: 'stripe', eventType: event.type },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

function mapStripeStatus(stripeStatus: string): 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'INACTIVE' {
  switch (stripeStatus) {
    case 'active': return 'ACTIVE';
    case 'past_due': return 'PAST_DUE';
    case 'canceled': return 'CANCELLED';
    case 'unpaid': return 'PAST_DUE';
    case 'trialing': return 'TRIALING';
    default: return 'ACTIVE';
  }
}

function verifyStripeSignature(payload: string, header: string, secret: string): any {
  const parts = header.split(',');
  const timestampPart = parts.find(p => p.startsWith('t='));
  const signaturePart = parts.find(p => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    throw new Error('Invalid signature header format');
  }

  const timestamp = timestampPart.slice(2);
  const expectedSig = signaturePart.slice(3);

  // Reject events older than 5 minutes (replay attack prevention)
  const tolerance = 300; // 5 minutes
  const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (timestampAge > tolerance) {
    throw new Error('Timestamp too old');
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const computedSig = createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Timing-safe comparison
  const a = Buffer.from(expectedSig);
  const b = Buffer.from(computedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Signature mismatch');
  }

  return JSON.parse(payload);
}
