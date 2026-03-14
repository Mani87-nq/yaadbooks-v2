'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircleIcon,
  WifiIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  ShoppingBagIcon,
  ScissorsIcon,
} from '@heroicons/react/24/solid';

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    priceJmd: 0,
    priceJmdAnnual: 0,
    priceUsd: 0,
    priceUsdAnnual: 0,
    subtitle: 'Try YaadBooks — forever free',
    features: [
      '1 user',
      '10 invoices/mo',
      '15 customers max',
      '3 quotations/mo',
      'Core accounting',
      'GCT calculation (view only)',
      'Last 30 days reports',
    ],
    cta: 'Start Free',
    popular: false,
    href: '/signup?plan=free',
  },
  {
    id: 'STARTER',
    name: 'Starter',
    priceJmd: 3499,
    priceJmdAnnual: 29158,
    priceUsd: 22.50,
    priceUsdAnnual: 187.50,
    subtitle: 'For growing businesses',
    features: [
      '3 users',
      'Unlimited invoices',
      'Unlimited customers',
      'Full GCT compliance + export',
      'Payroll (up to 5 employees)',
      'Bank reconciliation',
      'All reports (full history)',
      'Clean invoices (no watermark)',
    ],
    cta: 'Start Free Trial',
    popular: false,
    href: '/signup?plan=starter',
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    priceJmd: 7499,
    priceJmdAnnual: 62492,
    priceUsd: 48.25,
    priceUsdAnnual: 402.08,
    subtitle: 'Most popular for growing businesses',
    features: [
      'Unlimited users',
      '3 companies',
      'Unlimited invoices',
      // HIDDEN: Industry modules not yet built
      // '1 Industry Module included',
      'Employee Portal & Kiosk',
      'Full offline mode',
      'AI assistant',
      // HIDDEN: WhatsApp not yet implemented
      // 'WhatsApp notifications',
    ],
    cta: 'Start Free Trial',
    popular: true,
    href: '/signup?plan=professional',
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    priceJmd: 13999,
    priceJmdAnnual: 116658,
    priceUsd: 90.00,
    priceUsdAnnual: 750.00,
    subtitle: 'For multi-location businesses',
    features: [
      'Everything in Professional',
      '1 Module + ALL sub-modules',
      'Multi-location support',
      'Advanced analytics',
      'Custom reports',
      'API access',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    popular: false,
    href: '/signup?plan=business',
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    priceJmd: 22999,
    priceJmdAnnual: 191658,
    priceUsd: 149.99,
    priceUsdAnnual: 1249.92,
    subtitle: 'For large operations',
    features: [
      'Everything in Business',
      'ALL industry modules',
      'Unlimited companies',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'Onboarding assistance',
    ],
    cta: 'Contact Sales',
    popular: false,
    href: '/contact?reason=enterprise',
  },
];

const MODULES = [
  { name: 'Retail & Loyalty', icon: ShoppingBagIcon, color: 'bg-blue-100 text-blue-600' },
  { name: 'Restaurant & Bar', icon: BuildingStorefrontIcon, color: 'bg-orange-100 text-orange-600' },
  { name: 'Salon & Spa', icon: ScissorsIcon, color: 'bg-pink-100 text-pink-600' },
];

function formatJmd(amount: number): string {
  return new Intl.NumberFormat('en-JM', { style: 'decimal', maximumFractionDigits: 0 }).format(amount);
}

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Simple Pricing. Unlimited Users.
          </h2>
          <p className="text-xl text-gray-600 mb-2">
            Start free. Add modules as you grow. No per-user fees.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            All prices in JMD. Annual plans save 2 months.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                !isAnnual
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                isAnnual
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isAnnual
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                2 months free
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-16">
          {PLANS.map((plan) => {
            const price = isAnnual ? plan.priceJmdAnnual : plan.priceJmd;
            const priceUsd = isAnnual ? plan.priceUsdAnnual : plan.priceUsd;
            const period = isAnnual ? '/yr' : '/mo';
            const monthlyEquiv = isAnnual && plan.priceJmd > 0
              ? Math.round(plan.priceJmdAnnual / 12)
              : null;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl p-6 border-2 relative flex flex-col ${
                  plan.popular
                    ? 'border-emerald-500 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/20'
                    : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                    MOST POPULAR
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-gray-500 text-xs mt-1">{plan.subtitle}</p>
                </div>

                <div className="mb-1">
                  {plan.priceJmd === 0 ? (
                    <div>
                      <span className="text-3xl font-bold text-gray-900">Free</span>
                      <span className="text-gray-500 text-sm ml-1">forever</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-3xl font-bold text-gray-900">
                        J${formatJmd(isAnnual ? Math.round(plan.priceJmdAnnual / 12) : plan.priceJmd)}
                      </span>
                      <span className="text-gray-500 text-sm">/mo</span>
                    </div>
                  )}
                </div>

                {plan.priceJmd > 0 && (
                  <p className="text-xs text-gray-400 mb-4">
                    ~${priceUsd.toFixed(2)} USD{period}
                    {isAnnual && ` (J$${formatJmd(price)} billed annually)`}
                  </p>
                )}
                {plan.priceJmd === 0 && <div className="mb-4" />}

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`${plan.href}${isAnnual ? '&billing=annual' : ''}`}
                  className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                    plan.popular
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Industry Modules Preview */}
        <div className="text-center mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Choose Your Industry Module</h3>
          <p className="text-gray-600 text-sm mb-6">
            Each module adds specialized features for your business type. Included from Professional tier.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {MODULES.map((mod) => (
              <div key={mod.name} className="flex items-center gap-3 bg-white rounded-xl px-5 py-3 border border-gray-200 shadow-sm">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mod.color}`}>
                  <mod.icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-900">{mod.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Competitor Comparison Callout */}
        <div className="bg-emerald-50 rounded-2xl p-8 border border-emerald-200 text-center">
          <p className="text-lg font-bold text-emerald-900 mb-2">
            QuickBooks charges US$240/mo for 8 users. We charge J$7,499 — unlimited users.
          </p>
          <p className="text-emerald-700 text-sm">
            That's <span className="font-bold">$190+ in savings every month</span>. And we include POS, inventory, payroll, and offline mode.
          </p>
        </div>
      </div>
    </section>
  );
}
