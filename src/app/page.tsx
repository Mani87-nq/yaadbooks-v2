import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PricingSection from '@/components/PricingSection';
import ChatWidget from '@/components/ChatWidget';
import JsonLd from '@/components/marketing/JsonLd';
import { buildOrganizationSchema, buildSoftwareApplicationSchema } from '@/lib/seo/json-ld';
import {
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  WifiIcon,
  BoltIcon,
  UsersIcon,
  ShoppingBagIcon,
  BuildingStorefrontIcon,
  CubeTransparentIcon,
  DevicePhoneMobileIcon,
  SignalSlashIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  RocketLaunchIcon,
  CheckCircleIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { ScissorsIcon } from '@heroicons/react/24/solid';

export default async function LandingPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  if (accessToken) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={buildOrganizationSchema()} />
      <JsonLd data={buildSoftwareApplicationSchema()} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-lg">
                YB
              </div>
              <span className="text-xl font-bold text-gray-900">YaadBooks</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#offline" className="text-gray-600 hover:text-gray-900 font-medium">Offline Mode</a>
              <a href="#modules" className="text-gray-600 hover:text-gray-900 font-medium">Modules</a>
              <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium">Pricing</a>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section — Platform Messaging */}
      <section className="pt-24 pb-16 px-4 bg-gradient-to-br from-emerald-50 via-white to-yellow-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="pt-8">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <span className="text-lg">🇯🇲</span> Built for Jamaica &amp; the Caribbean
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Run Your Entire Business.{' '}
                <span className="text-emerald-600">Even Offline.</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                YaadBooks is the all-in-one business operating system built for Jamaica.
                Accounting, POS, payroll, employee management — with industry modules for
                retail, restaurants, and salons. And it works <strong>even when the internet goes down</strong>.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  href="/signup"
                  className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 text-center"
                >
                  Start Free — No Card Required
                </Link>
                <a
                  href="#offline"
                  className="flex items-center justify-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-gray-200 hover:border-emerald-300 transition-colors"
                >
                  <SignalSlashIcon className="w-6 h-6 text-emerald-600" />
                  See Offline Mode
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Free tier — forever
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited users from J$7,499/mo
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Works offline
                </div>
              </div>
            </div>

            {/* Dashboard Preview — Dual View */}
            <div className="relative">
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-1 shadow-2xl">
                <div className="bg-gray-900 rounded-xl overflow-hidden">
                  <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="ml-4 text-gray-400 text-sm">yaadbooks.com/dashboard</span>
                    <div className="ml-auto flex items-center gap-1.5 bg-emerald-600/20 text-emerald-400 px-2 py-0.5 rounded text-xs font-medium">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                      Online
                    </div>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <p className="text-xs text-gray-500">Revenue (JMD)</p>
                        <p className="text-lg font-bold text-gray-900">$2.4M</p>
                        <p className="text-xs text-emerald-600">↑ 12% this month</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <p className="text-xs text-gray-500">POS Sales</p>
                        <p className="text-lg font-bold text-gray-900">J$185K</p>
                        <p className="text-xs text-emerald-600">47 transactions</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <p className="text-xs text-gray-500">Active Modules</p>
                        <p className="text-lg font-bold text-gray-900">3</p>
                        <p className="text-xs text-blue-600">Retail · Restaurant · Salon</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-sm font-semibold text-gray-900">Today&apos;s Activity</p>
                        <span className="text-xs text-emerald-600">View All</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">🛒 POS Sale — Walk-in</span>
                          <span className="text-emerald-600 font-medium">+$45,000</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">✂️ Appointment — Keisha B.</span>
                          <span className="text-emerald-600 font-medium">+$8,500</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">🍽️ Table 5 — Dinner service</span>
                          <span className="text-emerald-600 font-medium">+$12,300</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg font-bold text-sm shadow-lg transform rotate-3">
                🇯🇲 Made in Jamaica
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">🇯🇲</p>
              <p className="text-sm text-gray-500">Built for Jamaica</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">GCT</p>
              <p className="text-sm text-gray-500">Auto-Calculated</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">100%</p>
              <p className="text-sm text-gray-500">TAJ Compliant</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">∞</p>
              <p className="text-sm text-gray-500">Users per Plan</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-3xl font-bold text-gray-900">
                <SignalSlashIcon className="w-7 h-7" />
                ✓
              </div>
              <p className="text-sm text-gray-500">Works Offline</p>
            </div>
          </div>
        </div>
      </section>

      {/* OFFLINE-FIRST — #1 Selling Point */}
      <section id="offline" className="py-20 px-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <SignalSlashIcon className="w-5 h-5" />
                Offline-First Architecture
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Your Business Runs Even When the Internet Doesn&apos;t
              </h2>
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                Caribbean internet can be unreliable. YaadBooks is built from the ground up to work offline.
                Process sales, manage appointments, clock in employees — all without connectivity.
                Everything syncs automatically when you reconnect.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  { icon: '🛒', text: 'POS keeps selling — ring up customers, process cash, print receipts' },
                  { icon: '👥', text: 'Employee Portal works — clock in/out, take breaks, view schedules' },
                  { icon: '📱', text: 'Full product catalog cached — search, scan barcodes, check stock' },
                  { icon: '🔄', text: 'Auto-sync when back online — nothing is ever lost' },
                  { icon: '🔒', text: 'PIN-secured offline access — encrypted, device-verified' },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-3 text-gray-300">
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-4 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <WifiIcon className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-white font-semibold">Hurricane? Power cut? No problem.</p>
                  <p className="text-emerald-300 text-sm">Your data is safe on-device and syncs when you&apos;re ready.</p>
                </div>
              </div>
            </div>

            {/* Offline Mode Visual */}
            <div className="relative">
              <div className="bg-gray-700 rounded-2xl p-1 shadow-2xl">
                <div className="bg-gray-900 rounded-xl overflow-hidden">
                  <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="ml-4 text-gray-400 text-sm">POS Terminal</span>
                    <div className="ml-auto flex items-center gap-1.5 bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded text-xs font-medium">
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
                      Offline
                    </div>
                  </div>
                  <div className="p-6 bg-gray-950">
                    <div className="flex items-center justify-between mb-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <div className="flex items-center gap-2">
                        <SignalSlashIcon className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-400 text-sm font-medium">Working Offline</span>
                      </div>
                      <span className="text-amber-300 text-xs">3 pending sync</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                        <div>
                          <p className="text-white text-sm font-medium">Jerk Chicken Plate</p>
                          <p className="text-gray-500 text-xs">x2 @ J$1,200</p>
                        </div>
                        <p className="text-white font-semibold">J$2,400</p>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                        <div>
                          <p className="text-white text-sm font-medium">Red Stripe Beer</p>
                          <p className="text-gray-500 text-xs">x3 @ J$500</p>
                        </div>
                        <p className="text-white font-semibold">J$1,500</p>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                        <div>
                          <p className="text-white text-sm font-medium">Ting Soda</p>
                          <p className="text-gray-500 text-xs">x2 @ J$250</p>
                        </div>
                        <p className="text-white font-semibold">J$500</p>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Subtotal</span>
                        <span className="text-white">J$4,400</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">GCT (15%)</span>
                        <span className="text-white">J$660</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t border-gray-700 pt-2">
                        <span className="text-emerald-400">Total</span>
                        <span className="text-emerald-400">J$5,060</span>
                      </div>
                    </div>
                    <button className="w-full mt-4 bg-emerald-600 text-white py-3 rounded-xl font-bold text-lg">
                      Charge J$5,060 — Cash
                    </button>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-3 -left-3 bg-amber-500 text-gray-900 px-4 py-2 rounded-lg font-bold text-sm shadow-lg transform -rotate-2">
                <SignalSlashIcon className="w-4 h-4 inline mr-1" />
                No Internet? No Problem.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Modules Section */}
      <section id="modules" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <CubeTransparentIcon className="w-5 h-5" />
              Modular Business OS
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              One Platform. Your Industry.
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Start with powerful core accounting, then add industry-specific modules for exactly what your business needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Retail Module */}
            <div className="bg-white rounded-2xl p-8 border-2 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShoppingBagIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Retail &amp; Loyalty</h3>
              <p className="text-gray-600 mb-6">
                For shops, boutiques, and stores. Loyalty programs, promotions, customer segments, and retail analytics.
              </p>
              <ul className="space-y-2 mb-6">
                {['Loyalty point programs', 'Promotion engine with promo codes', 'Customer segmentation', 'Member cards & tiers', 'Retail-specific reports'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="text-sm text-blue-600 font-semibold">Included from Professional</div>
            </div>

            {/* Restaurant Module */}
            <div className="bg-white rounded-2xl p-8 border-2 border-orange-200 hover:border-orange-400 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BuildingStorefrontIcon className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Restaurant &amp; Bar</h3>
              <p className="text-gray-600 mb-6">
                For restaurants, bars, and cafes. Table management, kitchen display, menu builder, and tip tracking.
              </p>
              <ul className="space-y-2 mb-6">
                {['Visual floor plan & tables', 'Kitchen Display System (KDS)', 'Menu with modifiers & courses', 'Reservations & walk-ins', 'Tip pooling & tracking'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="text-sm text-orange-600 font-semibold">Included from Professional</div>
            </div>

            {/* Salon Module */}
            <div className="bg-white rounded-2xl p-8 border-2 border-pink-200 hover:border-pink-400 hover:shadow-xl transition-all group">
              <div className="w-14 h-14 bg-pink-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ScissorsIcon className="w-8 h-8 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Salon &amp; Spa</h3>
              <p className="text-gray-600 mb-6">
                For salons, barbershops, and spas. Appointment booking, stylist management, and commission tracking.
              </p>
              <ul className="space-y-2 mb-6">
                {['Appointment calendar', 'Stylist profiles & schedules', 'Commission tracking', 'Walk-in queue', 'Client history & preferences'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-pink-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="text-sm text-pink-600 font-semibold">Included from Professional</div>
            </div>
          </div>

          {/* Expanded Module Showcases */}
          <div className="mt-20 space-y-20">

            {/* Salon Module Showcase */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  <ScissorsIcon className="w-5 h-5" />
                  Salon &amp; Spa Module
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                  Manage Every Chair, Every Stylist, Every Walk-In
                </h3>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  Built for Jamaican salons, barbershops, and spas. See your entire day at a glance — appointments, walk-ins, and commission payouts in J$.
                </p>
                <ul className="space-y-3">
                  {[
                    'Drag-and-drop appointment calendar with client history',
                    'Commission tracking per stylist — auto-calculated in J$',
                    'Walk-in queue management with estimated wait times',
                    'Service menu with duration, pricing, and add-ons',
                    'Client loyalty tracking and rebooking reminders via SMS/Email',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-600">
                      <svg className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-1 shadow-2xl">
                  <div className="bg-gray-900 rounded-xl overflow-hidden">
                    <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="ml-4 text-gray-400 text-sm">Salon Dashboard</span>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100">
                      {/* Appointment Calendar */}
                      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-sm font-semibold text-gray-900">Today&apos;s Appointments</p>
                          <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">Thursday</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 p-2 bg-pink-50 rounded-lg border-l-4 border-pink-500">
                            <div className="text-xs text-gray-500 w-12">9:00</div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">Keisha Brown</p>
                              <p className="text-xs text-gray-500">Box Braids &middot; Tanya M.</p>
                            </div>
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Confirmed</span>
                          </div>
                          <div className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                            <div className="text-xs text-gray-500 w-12">10:30</div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">Shelly-Ann Reid</p>
                              <p className="text-xs text-gray-500">Wash &amp; Set &middot; Nicole P.</p>
                            </div>
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">In Chair</span>
                          </div>
                          <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <div className="text-xs text-gray-500 w-12">11:45</div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">Danielle Campbell</p>
                              <p className="text-xs text-gray-500">Relaxer Touch-Up &middot; Keisha B.</p>
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Pending</span>
                          </div>
                        </div>
                      </div>
                      {/* Commission + Walk-In */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-2">Commission Today</p>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-700">Tanya M.</span>
                              <span className="font-semibold text-pink-600">J$4,200</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-700">Nicole P.</span>
                              <span className="font-semibold text-pink-600">J$3,800</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-700">Keisha B.</span>
                              <span className="font-semibold text-pink-600">J$5,100</span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-2">Walk-In Queue</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                              <span className="text-gray-700">Marcia W.</span>
                              <span className="text-gray-400 ml-auto">~15 min</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                              <span className="text-gray-700">Patrice J.</span>
                              <span className="text-gray-400 ml-auto">~35 min</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                              <span className="text-gray-700">Lisa-Ann S.</span>
                              <span className="text-gray-400 ml-auto">~50 min</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Restaurant Module Showcase */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 relative">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-1 shadow-2xl">
                  <div className="bg-gray-900 rounded-xl overflow-hidden">
                    <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="ml-4 text-gray-400 text-sm">Restaurant Dashboard</span>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100">
                      {/* Table Floor Plan */}
                      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-sm font-semibold text-gray-900">Floor Plan — Dinner Service</p>
                          <span className="text-xs text-gray-500">8 of 12 tables occupied</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { id: 'T1', status: 'occupied', amount: 'J$4,200', guests: 2 },
                            { id: 'T2', status: 'occupied', amount: 'J$8,750', guests: 4 },
                            { id: 'T3', status: 'available', amount: '', guests: 0 },
                            { id: 'T4', status: 'reserved', amount: '', guests: 0 },
                            { id: 'T5', status: 'occupied', amount: 'J$3,100', guests: 2 },
                            { id: 'T6', status: 'occupied', amount: 'J$12,400', guests: 6 },
                            { id: 'T7', status: 'available', amount: '', guests: 0 },
                            { id: 'T8', status: 'occupied', amount: 'J$5,600', guests: 3 },
                          ].map((table) => (
                            <div
                              key={table.id}
                              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs p-1 ${
                                table.status === 'occupied'
                                  ? 'bg-orange-100 border-2 border-orange-400'
                                  : table.status === 'reserved'
                                  ? 'bg-blue-100 border-2 border-blue-400'
                                  : 'bg-gray-50 border-2 border-dashed border-gray-300'
                              }`}
                            >
                              <span className="font-bold text-gray-700">{table.id}</span>
                              {table.status === 'occupied' && (
                                <>
                                  <span className="text-orange-600 font-semibold" style={{ fontSize: '10px' }}>{table.amount}</span>
                                  <span className="text-gray-400" style={{ fontSize: '9px' }}>{table.guests} guests</span>
                                </>
                              )}
                              {table.status === 'reserved' && (
                                <span className="text-blue-500" style={{ fontSize: '9px' }}>7:30 PM</span>
                              )}
                              {table.status === 'available' && (
                                <span className="text-emerald-500" style={{ fontSize: '9px' }}>Open</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* KDS + Reservations */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-2">Kitchen Display (KDS)</p>
                          <div className="space-y-1.5">
                            <div className="p-1.5 bg-red-50 rounded border-l-3 border-red-400 text-xs">
                              <p className="font-medium text-gray-800">T6 &middot; 12 min ago</p>
                              <p className="text-gray-500">2x Jerk Chicken, 1x Oxtail</p>
                            </div>
                            <div className="p-1.5 bg-amber-50 rounded border-l-3 border-amber-400 text-xs">
                              <p className="font-medium text-gray-800">T2 &middot; 5 min ago</p>
                              <p className="text-gray-500">1x Ackee &amp; Saltfish, 1x Curry Goat</p>
                            </div>
                            <div className="p-1.5 bg-emerald-50 rounded border-l-3 border-emerald-400 text-xs">
                              <p className="font-medium text-gray-800">T1 &middot; 2 min ago</p>
                              <p className="text-gray-500">1x Brown Stew Fish</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-2">Upcoming Reservations</p>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-700">Thompson Party</span>
                              <span className="text-orange-600">7:30 PM</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-700">Williams (6 ppl)</span>
                              <span className="text-orange-600">8:00 PM</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-700">Birthday — Grant</span>
                              <span className="text-orange-600">8:30 PM</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  <BuildingStorefrontIcon className="w-5 h-5" />
                  Restaurant &amp; Bar Module
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                  From Kitchen to Table — Every Order Tracked
                </h3>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  Built for Jamaican restaurants, bars, and food courts. Visual floor plan, kitchen display system, and seamless order flow with local menu items.
                </p>
                <ul className="space-y-3">
                  {[
                    'Visual table floor plan — see occupancy, bills, and status at a glance',
                    'Kitchen Display System (KDS) with order priority and timing',
                    'Menu builder with Jamaican dishes, modifiers, and courses',
                    'Reservation management with party sizes and special requests',
                    'Tip tracking, pooling, and automatic payroll integration',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-600">
                      <svg className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Retail Module Showcase */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  <ShoppingBagIcon className="w-5 h-5" />
                  Retail &amp; Loyalty Module
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                  Turn Every Customer into a Regular
                </h3>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  Built for Jamaican shops, boutiques, and retail stores. Loyalty tiers, targeted promotions, and customer segments that drive repeat business.
                </p>
                <ul className="space-y-3">
                  {[
                    'Bronze / Silver / Gold loyalty tiers with automatic upgrades',
                    'Promotion engine — promo codes, bundle deals, happy hours',
                    'Customer segmentation by spend, frequency, and last visit',
                    'Member card and digital loyalty integration',
                    'Retail analytics — top sellers, margin reports, stock velocity',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-600">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-1 shadow-2xl">
                  <div className="bg-gray-900 rounded-xl overflow-hidden">
                    <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="ml-4 text-gray-400 text-sm">Retail Dashboard</span>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100">
                      {/* Loyalty Tiers */}
                      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-sm font-semibold text-gray-900">Loyalty Members</p>
                          <span className="text-xs text-gray-500">247 active members</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-amber-50 rounded-lg p-2 text-center border border-amber-200">
                            <div className="text-lg font-bold text-amber-700">142</div>
                            <div className="text-xs text-amber-600 font-medium">Bronze</div>
                            <div className="text-xs text-gray-400">0–5K pts</div>
                          </div>
                          <div className="bg-gray-100 rounded-lg p-2 text-center border border-gray-300">
                            <div className="text-lg font-bold text-gray-600">78</div>
                            <div className="text-xs text-gray-500 font-medium">Silver</div>
                            <div className="text-xs text-gray-400">5K–15K pts</div>
                          </div>
                          <div className="bg-yellow-50 rounded-lg p-2 text-center border border-yellow-300">
                            <div className="text-lg font-bold text-yellow-700">27</div>
                            <div className="text-xs text-yellow-600 font-medium">Gold</div>
                            <div className="text-xs text-gray-400">15K+ pts</div>
                          </div>
                        </div>
                      </div>
                      {/* Promotions + Segments */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-2">Active Promotions</p>
                          <div className="space-y-1.5">
                            <div className="p-1.5 bg-emerald-50 rounded text-xs">
                              <p className="font-medium text-gray-800">SUMMER25</p>
                              <p className="text-gray-500">25% off — 34 uses</p>
                            </div>
                            <div className="p-1.5 bg-blue-50 rounded text-xs">
                              <p className="font-medium text-gray-800">BOGO-FRIDAY</p>
                              <p className="text-gray-500">Buy 1 Get 1 — 12 uses</p>
                            </div>
                            <div className="p-1.5 bg-purple-50 rounded text-xs">
                              <p className="font-medium text-gray-800">GOLD10</p>
                              <p className="text-gray-500">Gold tier 10% — 8 uses</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-2">Customer Segments</p>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-700">High Spenders</span>
                              <span className="font-semibold text-blue-600">42</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-700">At-Risk (30d+)</span>
                              <span className="font-semibold text-red-500">18</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-700">New This Month</span>
                              <span className="font-semibold text-emerald-600">31</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-700">Regulars (Weekly)</span>
                              <span className="font-semibold text-purple-600">67</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <RocketLaunchIcon className="w-5 h-5" />
              Get Started in Minutes
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Go from zero to running your business in under five minutes. No consultants, no setup fees, no headache.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative text-center group">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-emerald-100 group-hover:scale-110 transition-transform">
                <CheckCircleIcon className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Sign Up Free</h3>
              <p className="text-sm font-medium text-emerald-600 mb-3">30 seconds</p>
              <p className="text-gray-600">Create your account with just your email. No credit card, no contracts. Your free tier is yours forever.</p>
            </div>
            {/* Step 2 */}
            <div className="relative text-center group">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-blue-100 group-hover:scale-110 transition-transform">
                <CubeTransparentIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Choose Your Modules</h3>
              <p className="text-sm font-medium text-blue-600 mb-3">Pick your industry</p>
              <p className="text-gray-600">Start with core accounting, then activate Retail, Restaurant, or Salon modules. Only pay for what you use.</p>
            </div>
            {/* Step 3 */}
            <div className="relative text-center group">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-amber-100 group-hover:scale-110 transition-transform">
                <BoltIcon className="w-8 h-8 text-amber-600" />
              </div>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-600 text-white font-bold text-sm">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Start Selling</h3>
              <p className="text-sm font-medium text-amber-600 mb-3">Even offline</p>
              <p className="text-gray-600">Ring up your first sale, book your first appointment, or seat your first table — even if the internet is down.</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30"
            >
              <RocketLaunchIcon className="w-6 h-6" />
              Start Free — Takes 30 Seconds
            </Link>
          </div>
        </div>
      </section>

      {/* Employee Portal & Kiosk */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <UsersIcon className="w-5 h-5" />
                Employee Portal
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Your Team. One PIN Away.
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Give every employee their own simplified portal. Cashiers see the POS. Managers see reports.
                Stylists see their appointments. Everyone clocks in with a 4-digit PIN — even offline.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { title: 'Kiosk Mode', desc: 'Locked-down tablet terminal for shared devices', icon: DevicePhoneMobileIcon },
                  { title: 'PIN Authentication', desc: 'Fast 4-digit login, military-grade encryption', icon: ShieldCheckIcon },
                  { title: 'Clock In/Out', desc: 'Track hours, breaks, overtime automatically', icon: BoltIcon },
                  { title: 'Role-Based Views', desc: 'Each role sees only what they need', icon: UsersIcon },
                ].map((item) => (
                  <div key={item.title} className="p-4 bg-white rounded-xl border border-gray-200">
                    <item.icon className="w-6 h-6 text-indigo-600 mb-2" />
                    <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                    <p className="text-gray-500 text-xs mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Kiosk Preview */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-w-sm mx-auto">
                <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
                  <span className="text-white font-semibold">Employee Kiosk</span>
                  <div className="flex items-center gap-1.5 bg-emerald-500 text-white/90 px-2 py-0.5 rounded text-xs">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    Ready
                  </div>
                </div>
                <div className="p-8 text-center">
                  <p className="text-gray-500 text-sm mb-6">Enter your PIN to start</p>
                  <div className="flex justify-center gap-3 mb-8">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`w-4 h-4 rounded-full ${i <= 3 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3 max-w-[220px] mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, '⌫'].map((key, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded-xl flex items-center justify-center text-lg font-semibold ${
                          key === null
                            ? ''
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        {key}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Switch Section */}
      <section id="why-switch" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Jamaican Businesses Are Switching
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Foreign software wasn&apos;t built for Jamaica. We were.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-red-50 rounded-2xl p-8 border-2 border-red-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">😤</span>
                </div>
                <h3 className="text-xl font-bold text-red-900">QuickBooks / Xero</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'US$30-60/mo for BASIC features',
                  'Charges per user ($15-30/user)',
                  'No POS system included',
                  'No offline mode',
                  "Doesn't know GCT, NIS, NHT, PAYE",
                  'No employee kiosk',
                  'Support in a different timezone',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-red-700">
                    <svg className="w-5 h-5 mt-0.5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-8 border-2 border-emerald-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">🎉</span>
                </div>
                <h3 className="text-xl font-bold text-emerald-900">YaadBooks</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Free tier. Paid from J$3,499/mo',
                  'UNLIMITED users on Professional+',
                  'Full POS with offline mode included',
                  'Works without internet — syncs later',
                  'GCT, NIS, NHT, PAYE, Ed Tax built-in',
                  'Employee Portal with PIN kiosk',
                  'Local support who understand your business',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-emerald-700">
                    <svg className="w-5 h-5 mt-0.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need. Built In.
            </h2>
            <p className="text-xl text-gray-600">
              Core features every business needs — no add-ons, no surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '📄', title: 'Professional Invoicing', desc: 'Beautiful invoices with automatic GCT. Send via email instantly.' },
              { icon: '🛒', title: 'Point of Sale', desc: 'Fast, touch-friendly POS for any business. Works offline.' },
              { icon: '📦', title: 'Inventory Management', desc: 'Track stock, manage variants, barcode scanning, multi-location.' },
              { icon: '💰', title: 'Payroll & Compliance', desc: 'Auto-calculate NIS, NHT, PAYE, Ed Tax. Generate payslips instantly.' },
              { icon: '🏦', title: 'Bank Reconciliation', desc: 'Connect to NCB, Scotia, JMMB and more. Reconcile in minutes.' },
              { icon: '📊', title: 'Financial Reports', desc: "P&L, Balance Sheet, Cash Flow, GCT returns — TAJ-ready reports." },
              { icon: '💱', title: 'Multi-Currency', desc: 'Track JMD and USD side by side. Convert at live rates.' },
              { icon: '🔍', title: 'Audit Trail', desc: 'Every action logged. TAJ-ready compliance reporting.' },
            ].map((feature) => (
              <div key={feature.title} className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all">
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Assistant */}
      <section className="py-20 px-4 bg-gradient-to-br from-emerald-50 via-white to-yellow-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <SparklesIcon className="w-5 h-5" />
                AI-Powered
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Your AI Business Assistant
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Get instant answers about your books, tax guidance for Jamaica, and financial insights — from an AI that understands your business.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <ChatBubbleLeftRightIcon className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Ask Anything About Your Books</p>
                    <p className="text-gray-600 text-sm">From GCT to payroll — get clear answers instantly.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <LightBulbIcon className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Smart Financial Insights</p>
                    <p className="text-gray-600 text-sm">Spot trends and cost-saving opportunities automatically.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheckIcon className="w-6 h-6 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Tax Compliance Guidance</p>
                    <p className="text-gray-600 text-sm">Stay on top of TAJ deadlines and statutory obligations.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                <div className="bg-emerald-600 px-6 py-4 flex items-center gap-3">
                  <SparklesIcon className="w-6 h-6 text-white" />
                  <span className="text-white font-semibold">YaadBooks AI</span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-end">
                    <div className="bg-emerald-50 text-gray-800 rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs text-sm">
                      How much GCT do I owe this quarter?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-sm text-sm">
                      Your GCT liability this quarter is <span className="font-semibold">J$124,350</span>. Filing deadline: <span className="font-semibold">March 15th</span>. Want me to generate the return?
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-emerald-50 text-gray-800 rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs text-sm">
                      Which stylist earned the most commission this month?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-sm text-sm">
                      <span className="font-semibold">Keisha B.</span> earned J$48,200 in commission from 34 appointments. That&apos;s 22% above her monthly average.
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-3 -left-3 bg-purple-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg transform -rotate-2">
                <SparklesIcon className="w-4 h-4 inline mr-1" />
                AI Built-In
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-emerald-600">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-16">
            Trusted by Jamaican Business Owners
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Finally, software that understands GCT! I used to spend hours on tax calculations. Now it's automatic.",
                name: 'Michelle Brown',
                business: "Brown's Bakery, Kingston",
              },
              {
                quote: "The offline POS saved us during the last storm. We kept serving customers while the competition was shut down.",
                name: 'Andrew Williams',
                business: 'Williams Bar & Grill, Montego Bay',
              },
              {
                quote: "My 8 stylists all use the kiosk. QuickBooks would charge US$240/mo for that. YaadBooks? J$7,499.",
                name: 'Karen Thompson',
                business: 'KT Beauty Salon, Mandeville',
              },
            ].map((testimonial, i) => (
              <div key={i} className="bg-white/10 backdrop-blur rounded-2xl p-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-white text-lg mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
                <div>
                  <p className="text-white font-semibold">{testimonial.name}</p>
                  <p className="text-emerald-200 text-sm">{testimonial.business}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* Built for Jamaica */}
      <section className="py-20 px-4 bg-gradient-to-br from-emerald-50 via-white to-yellow-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <span className="text-lg">🇯🇲</span>
              Built for Jamaica
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Not Adapted. Built From Scratch for Jamaica.
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every tax code, every deduction, every compliance requirement — native from day one. No workarounds, no foreign plugins.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* GCT Compliance */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <ShieldCheckIcon className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">GCT Compliance (15%)</h3>
              <p className="text-gray-600 text-sm">
                Automatic General Consumption Tax calculation on every invoice, POS sale, and receipt. Always accurate, always compliant.
              </p>
            </div>

            {/* Statutory Deductions */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <BanknotesIcon className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">NIS, NHT, PAYE, Ed Tax</h3>
              <p className="text-gray-600 text-sm">
                All statutory deductions calculated automatically on every payroll run. Employer and employee portions handled correctly.
              </p>
            </div>

            {/* TAJ Returns */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <ClipboardDocumentListIcon className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">TAJ Return Generation</h3>
              <p className="text-gray-600 text-sm">
                Generate GCT returns, employer&apos;s annual return (S01), and monthly statutory reports ready for TAJ submission.
              </p>
            </div>

            {/* JMD First-Class */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <CurrencyDollarIcon className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">JMD First-Class Currency</h3>
              <p className="text-gray-600 text-sm">
                Jamaican Dollar is the default, not an afterthought. Multi-currency support with live JMD/USD conversion rates built in.
              </p>
            </div>

            {/* Local Bank Integration */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">🏦</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Local Bank Integration</h3>
              <p className="text-gray-600 text-sm">
                Connect directly to NCB, Scotiabank, JMMB, and other Jamaican banks for statement import and reconciliation.
              </p>
            </div>

            {/* Caribbean Ready */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">🌴</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Caribbean Ready</h3>
              <p className="text-gray-600 text-sm">
                Expanding across the Caribbean. Trinidad GCT, Barbados VAT, and regional compliance modules coming soon.
              </p>
            </div>
          </div>

          <div className="mt-12 bg-emerald-600 rounded-2xl p-8 md:p-12 text-center">
            <h3 className="text-2xl font-bold text-white mb-3">
              Stop forcing foreign software to work for Jamaica
            </h3>
            <p className="text-emerald-100 text-lg mb-6 max-w-2xl mx-auto">
              YaadBooks was designed from the first line of code for Jamaican tax law, Jamaican banks, and Jamaican businesses.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-white text-emerald-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-50 transition-colors"
            >
              Try It Free — Made for You
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Run Your Business — Online or Offline?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            The accounting platform built from the ground up for Jamaican businesses.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-emerald-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/30"
          >
            Start Free — No Card Required
          </Link>
          <p className="mt-4 text-gray-500 text-sm">Free tier available forever. Upgrade anytime.</p>
        </div>
      </section>

      {/* AI Chat Widget */}
      <ChatWidget />

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-lg">
                  YB
                </div>
                <span className="text-xl font-bold text-white">YaadBooks</span>
              </div>
              <p className="text-gray-500 mb-4">
                The all-in-one business operating system built for Jamaica and the Caribbean. Works offline.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white">Core Features</a></li>
                <li><a href="#modules" className="hover:text-white">Industry Modules</a></li>
                <li><a href="#offline" className="hover:text-white">Offline Mode</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
                <li><Link href="/security" className="hover:text-white">Security</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Contact Us</h4>
              <ul className="space-y-2">
                <li>📍 Middletown, CT, USA</li>
                <li>📧 support@yaadbooks.com</li>
                <li>📞 <a href="tel:+18766139119" className="hover:text-white">876-613-9119</a> (Jamaica)</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm">
              © 2026 YaadBooks. Built for Jamaica 🇯🇲 by the diaspora.
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white">Terms of Service</Link>
              <Link href="/security" className="hover:text-white">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
