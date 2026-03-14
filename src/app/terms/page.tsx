import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | YaadBooks',
  description: 'Terms and conditions for using YaadBooks accounting software in Jamaica.',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-lg">
                YB
              </div>
              <span className="text-xl font-bold text-gray-900">YaadBooks</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                Sign In
              </Link>
              <Link 
                href="/signup" 
                className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-gray-500">Last updated: February 23, 2025</p>
          </div>

          <div className="prose prose-lg prose-emerald max-w-none">
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-600 mb-4">
                By accessing or using YaadBooks (&quot;the Service&quot;), operated by YaadBooks Limited, a company registered 
                under the laws of Jamaica, you agree to be bound by these Terms of Service. If you disagree with any 
                part of these terms, you may not access the Service.
              </p>
              <p className="text-gray-600">
                These Terms constitute a legally binding agreement between you and YaadBooks Limited regarding your 
                use of our cloud-based accounting, invoicing, payroll, and business management software platform.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-600 mb-4">
                YaadBooks provides a comprehensive business management solution designed specifically for Jamaican 
                businesses, including but not limited to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Professional invoicing with automatic GCT (General Consumption Tax) calculation</li>
                <li>Point of Sale (POS) systems for retail and restaurant operations</li>
                <li>Inventory and stock management</li>
                <li>Payroll processing with Jamaican statutory deductions (NIS, NHT, PAYE, Education Tax)</li>
                <li>Financial reporting and TAJ (Tax Administration Jamaica) compliance reports</li>
                <li>Multi-currency support with JMD as the primary currency</li>
                <li>Bank reconciliation with major Jamaican financial institutions</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Account Registration</h2>
              <p className="text-gray-600 mb-4">
                To use the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Keep your password secure and confidential</li>
                <li>Accept responsibility for all activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized access or security breaches</li>
              </ul>
              <p className="text-gray-600 mt-4">
                You must be at least 18 years old and have the legal capacity to enter into contracts under 
                Jamaican law to create an account.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Subscription Plans and Pricing</h2>
              <p className="text-gray-600 mb-4">
                YaadBooks offers various subscription plans with different features and pricing tiers. By selecting 
                a subscription plan, you agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Pay all applicable fees in USD or JMD as specified at checkout</li>
                <li>Authorize recurring billing at the subscription interval you select (monthly or annually)</li>
                <li>Accept that prices may change with 30 days&apos; prior notice</li>
              </ul>
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 mt-4">
                <p className="text-emerald-800">
                  <strong>Currency Note:</strong> While prices are displayed in USD for standardization, we accept 
                  payments in Jamaican Dollars (JMD) at the prevailing exchange rate at the time of transaction.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Payment Terms</h2>
              <p className="text-gray-600 mb-4">
                All payments are processed securely through our payment partners. You agree that:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Payment is due at the beginning of each billing cycle</li>
                <li>Failed payments may result in service suspension after a 7-day grace period</li>
                <li>You are responsible for any applicable GCT or other taxes on subscription fees</li>
                <li>Refunds are provided in accordance with our Refund Policy (see Section 7)</li>
                <li>Bank transfer payments must reference your account ID for proper credit</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cancellation Policy</h2>
              <p className="text-gray-600 mb-4">
                You may cancel your subscription at any time through your account settings or by contacting support. 
                Upon cancellation:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Your subscription remains active until the end of the current billing period</li>
                <li>No partial refunds are provided for unused time within a billing period</li>
                <li>You retain read-only access to export your data for 30 days after cancellation</li>
                <li>After 30 days, your data may be permanently deleted in accordance with our data retention policy</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Refund Policy</h2>
              <p className="text-gray-600 mb-4">
                We offer a 14-day money-back guarantee for new subscribers. If you are not satisfied with the 
                Service within the first 14 days of your initial subscription, you may request a full refund. 
                After this period:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Annual subscriptions: Pro-rata refund for unused full months, less a 15% administrative fee</li>
                <li>Monthly subscriptions: No refunds for partial months</li>
                <li>Refunds are processed within 10 business days to the original payment method</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Acceptable Use</h2>
              <p className="text-gray-600 mb-4">
                You agree not to use the Service for any unlawful purpose or in any way that:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Violates any Jamaican or international law or regulation</li>
                <li>Infringes upon the intellectual property rights of others</li>
                <li>Transmits malware, viruses, or other harmful code</li>
                <li>Attempts to gain unauthorized access to our systems or other users&apos; accounts</li>
                <li>Interferes with the proper functioning of the Service</li>
                <li>Uses the Service for money laundering, tax evasion, or other financial crimes</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Tax Compliance Disclaimer</h2>
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                <p className="text-amber-800 mb-4">
                  <strong>Important:</strong> While YaadBooks provides tools to assist with GCT calculations, 
                  payroll deductions, and tax report generation, you remain solely responsible for:
                </p>
                <ul className="list-disc pl-6 text-amber-800 space-y-2">
                  <li>The accuracy of tax filings submitted to TAJ (Tax Administration Jamaica)</li>
                  <li>Compliance with all applicable tax laws and regulations</li>
                  <li>Verification of calculated amounts before submission</li>
                  <li>Timely filing and payment of all statutory obligations</li>
                </ul>
                <p className="text-amber-800 mt-4">
                  YaadBooks is not a licensed accounting firm or tax advisor. We strongly recommend consulting 
                  with a qualified Jamaican accountant or tax professional for complex tax matters.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Data Ownership and Rights</h2>
              <p className="text-gray-600 mb-4">
                You retain full ownership of all data you input into YaadBooks. We do not claim any ownership 
                rights over your business data, financial records, customer information, or other content you 
                create using our Service.
              </p>
              <p className="text-gray-600">
                You grant YaadBooks a limited license to use your data solely for the purpose of providing and 
                improving the Service, including generating anonymized, aggregated statistics that cannot identify 
                you or your business.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Intellectual Property</h2>
              <p className="text-gray-600 mb-4">
                The Service, including its original content, features, functionality, design, and branding, 
                is owned by YaadBooks Limited and is protected by Jamaican and international copyright, 
                trademark, and other intellectual property laws.
              </p>
              <p className="text-gray-600">
                You may not copy, modify, distribute, sell, or lease any part of our Service without explicit 
                written permission from YaadBooks Limited.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Service Availability and Modifications</h2>
              <p className="text-gray-600 mb-4">
                We strive to maintain 99.9% uptime but do not guarantee uninterrupted access. We reserve the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Perform scheduled maintenance with advance notice when possible</li>
                <li>Modify or discontinue features with 30 days&apos; notice</li>
                <li>Update pricing with 30 days&apos; notice before your next billing cycle</li>
                <li>Suspend service for suspected violations of these Terms</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Limitation of Liability</h2>
              <p className="text-gray-600 mb-4">
                To the maximum extent permitted by Jamaican law:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>YaadBooks shall not be liable for any indirect, incidental, special, consequential, or 
                punitive damages arising from your use of the Service</li>
                <li>Our total liability for any claims arising from these Terms or the Service shall not exceed 
                the amount you paid us in the 12 months preceding the claim</li>
                <li>We are not liable for any loss of data, profits, or business opportunities</li>
                <li>We are not responsible for third-party services integrated with YaadBooks</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Indemnification</h2>
              <p className="text-gray-600">
                You agree to indemnify and hold harmless YaadBooks Limited, its directors, employees, and agents 
                from any claims, damages, losses, or expenses (including legal fees) arising from your use of 
                the Service, violation of these Terms, or infringement of any third-party rights.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Governing Law and Dispute Resolution</h2>
              <p className="text-gray-600 mb-4">
                These Terms are governed by and construed in accordance with the laws of Jamaica, without regard 
                to conflict of law principles.
              </p>
              <p className="text-gray-600 mb-4">
                Any dispute arising from these Terms shall first be attempted to be resolved through good-faith 
                negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration 
                in Kingston, Jamaica, in accordance with the Arbitration Act of Jamaica.
              </p>
              <p className="text-gray-600">
                The courts of Jamaica shall have exclusive jurisdiction over any matters not subject to arbitration.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Changes to Terms</h2>
              <p className="text-gray-600">
                We may update these Terms from time to time. We will notify you of material changes via email 
                or through the Service at least 30 days before they take effect. Your continued use of the 
                Service after the changes take effect constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">17. Contact Information</h2>
              <p className="text-gray-600 mb-4">
                For questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 rounded-xl p-6">
                <p className="text-gray-900 font-semibold">DolphyTech (Operating as YaadBooks)</p>
                <p className="text-gray-600">515 Centerpoint Drive, Suite #212</p>
                <p className="text-gray-600">Middletown, CT 06457, USA</p>
                <p className="text-gray-600">Email: legal@yaadbooks.com</p>
                <p className="text-gray-600">Support: support@yaadbooks.com</p>
                <p className="text-gray-600">Jamaica Support: <a href="tel:+18766139119" className="text-emerald-600 hover:text-emerald-700">876-613-9119</a></p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-medium">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm">
            © 2026 YaadBooks. Built for Jamaica 🇯🇲 by the diaspora.
          </div>
          <div className="flex gap-6 text-sm">
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white text-white">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
