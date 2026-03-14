import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | YaadBooks',
  description: 'Privacy policy for YaadBooks accounting software - how we collect, use, and protect your data.',
};

export default function PrivacyPolicyPage() {
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-gray-500">Last updated: February 23, 2025</p>
          </div>

          <div className="prose prose-lg prose-emerald max-w-none">
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-600 mb-4">
                YaadBooks Limited (&quot;YaadBooks,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when 
                you use our cloud-based accounting and business management platform.
              </p>
              <p className="text-gray-600">
                By using YaadBooks, you consent to the data practices described in this policy. If you do not 
                agree with our policies and practices, please do not use our Service.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Information You Provide</h3>
              <p className="text-gray-600 mb-4">We collect information that you voluntarily provide, including:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
                <li><strong>Account Information:</strong> Name, email address, phone number, business name, 
                TRN (Taxpayer Registration Number), business address</li>
                <li><strong>Financial Data:</strong> Bank account details for reconciliation, payment information, 
                invoices, expenses, and financial transactions</li>
                <li><strong>Employee Data:</strong> For payroll processing — names, TRN, NIS numbers, salary 
                information, bank details</li>
                <li><strong>Customer Data:</strong> Your customers&apos; names, contact information, and transaction history</li>
                <li><strong>Support Communications:</strong> Information shared when you contact our support team</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Automatically Collected Information</h3>
              <p className="text-gray-600 mb-4">When you access our Service, we automatically collect:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the platform</li>
                <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
                <li><strong>Cookies:</strong> Session and preference cookies (see Section 8)</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-600 mb-4">We use the collected information for the following purposes:</p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Service Delivery:</strong> To provide and maintain our accounting, invoicing, payroll, 
                and business management features</li>
                <li><strong>Tax Compliance:</strong> To calculate GCT, generate TAJ-compliant reports, and assist 
                with statutory deductions (NIS, NHT, PAYE, Education Tax)</li>
                <li><strong>Account Management:</strong> To create and manage your account, process payments, and 
                communicate about your subscription</li>
                <li><strong>Customer Support:</strong> To respond to your inquiries and resolve issues</li>
                <li><strong>Service Improvement:</strong> To analyze usage patterns and improve our platform</li>
                <li><strong>Security:</strong> To detect and prevent fraud, unauthorized access, and abuse</li>
                <li><strong>Legal Compliance:</strong> To comply with applicable Jamaican laws and regulations</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
              <p className="text-gray-600 mb-4">
                We do not sell your personal or business data. We may share information only in the following circumstances:
              </p>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Service Providers</h3>
              <p className="text-gray-600 mb-4">
                We work with trusted third-party providers who assist in operating our Service:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
                <li><strong>Payment Processors:</strong> To securely process subscription payments</li>
                <li><strong>Cloud Infrastructure:</strong> For secure data storage and processing</li>
                <li><strong>Email Services:</strong> To send transactional and support emails</li>
                <li><strong>Analytics:</strong> To understand how our Service is used (anonymized data only)</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.2 Legal Requirements</h3>
              <p className="text-gray-600 mb-4">
                We may disclose your information if required by law or in response to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
                <li>Valid legal process from Jamaican courts or regulatory authorities</li>
                <li>Requests from Tax Administration Jamaica (TAJ) or other government bodies with proper authority</li>
                <li>To protect the rights, property, or safety of YaadBooks, our users, or the public</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.3 Business Transfers</h3>
              <p className="text-gray-600">
                In the event of a merger, acquisition, or sale of assets, your data may be transferred to the 
                acquiring entity, subject to the same privacy protections described in this policy.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-600 mb-4">
                We implement robust security measures to protect your data:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
                <li><strong>Access Controls:</strong> Role-based access with multi-factor authentication for 
                administrative access</li>
                <li><strong>Infrastructure:</strong> Hosted on secure, SOC 2 compliant cloud infrastructure</li>
                <li><strong>Monitoring:</strong> 24/7 security monitoring and intrusion detection</li>
                <li><strong>Regular Audits:</strong> Periodic security assessments and penetration testing</li>
                <li><strong>Employee Training:</strong> All staff receive data protection training</li>
              </ul>
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mt-4">
                <p className="text-amber-800">
                  <strong>Note:</strong> While we take extensive measures to protect your data, no system is 
                  100% secure. You are responsible for maintaining the confidentiality of your account credentials.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
              <p className="text-gray-600 mb-4">
                We retain your data as follows:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Active Accounts:</strong> Data is retained for the duration of your subscription</li>
                <li><strong>After Cancellation:</strong> Account data is retained for 30 days to allow data 
                export, then scheduled for deletion</li>
                <li><strong>Financial Records:</strong> In compliance with Jamaican law, financial transaction 
                records may be retained for up to 7 years for audit purposes</li>
                <li><strong>Legal Requirements:</strong> Data may be retained longer if required by law or 
                pending legal proceedings</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights</h2>
              <p className="text-gray-600 mb-4">
                You have the following rights regarding your personal data:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data we hold</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal retention 
                requirements)</li>
                <li><strong>Export:</strong> Download your data in a portable format</li>
                <li><strong>Objection:</strong> Object to certain processing of your data</li>
                <li><strong>Withdrawal of Consent:</strong> Withdraw consent where processing is based on consent</li>
              </ul>
              <p className="text-gray-600 mt-4">
                To exercise these rights, contact us at privacy@yaadbooks.com. We will respond within 30 days.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Cookies and Tracking</h2>
              <p className="text-gray-600 mb-4">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for the Service to function (authentication, 
                security, preferences)</li>
                <li><strong>Analytics Cookies:</strong> Help us understand usage patterns to improve the Service</li>
                <li><strong>Performance Cookies:</strong> Optimize loading times and user experience</li>
              </ul>
              <p className="text-gray-600 mt-4">
                You can manage cookie preferences through your browser settings. Note that disabling essential 
                cookies may affect Service functionality.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-600 mb-4">
                While YaadBooks is a US-based company serving Jamaican businesses, some of our service providers 
                may process data in other jurisdictions. When this occurs, we ensure:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Data processing agreements are in place with all providers</li>
                <li>Appropriate safeguards protect your data during transfer</li>
                <li>Providers meet security standards comparable to our own</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Third-Party Services</h2>
              <p className="text-gray-600 mb-4">
                Our Service may integrate with third-party services such as:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>Banking institutions (NCB, Scotiabank, JMMB) for reconciliation</li>
                <li>Payment gateways for processing transactions</li>
                <li>Email services for sending invoices</li>
              </ul>
              <p className="text-gray-600 mt-4">
                These integrations are initiated by you and governed by the respective third party&apos;s privacy 
                policies. We recommend reviewing their policies before enabling integrations.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Children&apos;s Privacy</h2>
              <p className="text-gray-600">
                YaadBooks is not intended for individuals under 18 years of age. We do not knowingly collect 
                personal information from minors. If we discover that a minor has provided us with personal 
                information, we will delete it promptly.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Changes to This Policy</h2>
              <p className="text-gray-600">
                We may update this Privacy Policy periodically. We will notify you of material changes by email 
                and/or by posting a notice on our Service at least 30 days before the changes take effect. Your 
                continued use of the Service after the effective date constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Data Protection Officer</h2>
              <p className="text-gray-600 mb-4">
                For privacy-related inquiries or to exercise your data rights, contact our Data Protection Officer:
              </p>
              <div className="bg-gray-50 rounded-xl p-6">
                <p className="text-gray-900 font-semibold">Data Protection Officer</p>
                <p className="text-gray-600">DolphyTech (Operating as YaadBooks)</p>
                <p className="text-gray-600">515 Centerpoint Drive, Suite #212</p>
                <p className="text-gray-600">Middletown, CT 06457, USA</p>
                <p className="text-gray-600">Email: privacy@yaadbooks.com</p>
                <p className="text-gray-600">Jamaica Support: <a href="tel:+18766139119" className="text-emerald-600 hover:text-emerald-700">876-613-9119</a></p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Jamaican Data Protection Framework</h2>
              <p className="text-gray-600 mb-4">
                YaadBooks complies with the Data Protection Act of Jamaica (2020) and other applicable data 
                protection regulations. Our practices are designed to meet or exceed the requirements set forth 
                by the Office of the Information Commissioner of Jamaica.
              </p>
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4">
                <p className="text-emerald-800">
                  <strong>Your Rights Under Jamaican Law:</strong> The Data Protection Act provides you with 
                  specific rights regarding your personal data. If you believe your rights have been violated, 
                  you may lodge a complaint with the Office of the Information Commissioner of Jamaica.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Contact Us</h2>
              <p className="text-gray-600 mb-4">
                If you have questions or concerns about this Privacy Policy, please contact us:
              </p>
              <div className="bg-gray-50 rounded-xl p-6">
                <p className="text-gray-900 font-semibold">DolphyTech (Operating as YaadBooks)</p>
                <p className="text-gray-600">515 Centerpoint Drive, Suite #212</p>
                <p className="text-gray-600">Middletown, CT 06457, USA</p>
                <p className="text-gray-600">Privacy inquiries: privacy@yaadbooks.com</p>
                <p className="text-gray-600">General support: support@yaadbooks.com</p>
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
            <Link href="/privacy" className="hover:text-white text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
