import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy & Terms of Service',
  description: 'Privacy Policy and Terms of Service for Ocean PULSE by Balean.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-balean-off-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-balean-cyan via-balean-cyan-light to-balean-coral pt-8 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/ocean-pulse-app"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6 text-sm"
          >
            <i className="fi fi-rr-arrow-left" />
            Back to app
          </Link>
          <h1 className="text-3xl font-bold text-white">Privacy Policy & Terms of Service</h1>
          <p className="text-white/80 mt-2">Last updated: January 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 -mt-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 space-y-10">

          {/* PRIVACY POLICY */}
          <section>
            <h2 className="text-2xl font-bold text-balean-navy mb-4">Privacy Policy</h2>
            <p className="text-balean-gray-500 leading-relaxed">
              Balean (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, and safeguard your information
              when you use Ocean PULSE, our marine conservation progressive web application.
            </p>
          </section>

          {/* 1. Information We Collect */}
          <section>
            <h3 className="text-xl font-semibold text-balean-navy mb-3">1. Information We Collect</h3>

            <h4 className="font-semibold text-balean-navy mt-4 mb-2">1.1 Personal Data</h4>
            <p className="text-balean-gray-500 leading-relaxed mb-2">
              When you create an account or use certain features, we may collect:
            </p>
            <ul className="list-disc list-inside text-balean-gray-500 space-y-1 ml-2">
              <li>Email address (for account creation and communication)</li>
              <li>Display name (optional, for your profile)</li>
              <li>Authentication provider data (e.g. Google account name and avatar)</li>
            </ul>

            <h4 className="font-semibold text-balean-navy mt-4 mb-2">1.2 User-Generated Content</h4>
            <p className="text-balean-gray-500 leading-relaxed mb-2">
              When you submit observations, we collect:
            </p>
            <ul className="list-disc list-inside text-balean-gray-500 space-y-1 ml-2">
              <li>Observation data (species name, report type, notes, health assessments)</li>
              <li>Photos you upload as observation evidence</li>
              <li>Location data associated with your observation (MPA selection)</li>
            </ul>

            <h4 className="font-semibold text-balean-navy mt-4 mb-2">1.3 Automatically Collected Information</h4>
            <p className="text-balean-gray-500 leading-relaxed mb-2">
              With your consent, we may collect:
            </p>
            <ul className="list-disc list-inside text-balean-gray-500 space-y-1 ml-2">
              <li>Browser type and operating system</li>
              <li>Pages viewed and features used</li>
              <li>Referring website</li>
              <li>Approximate geographic location (country/city level)</li>
              <li>Device type and screen resolution</li>
            </ul>
            <p className="text-balean-gray-500 leading-relaxed mt-2">
              This information is collected only with your consent through cookies and similar technologies.
              See Section 4 for details.
            </p>
          </section>

          {/* 2. How We Use Your Information */}
          <section>
            <h3 className="text-xl font-semibold text-balean-navy mb-3">2. How We Use Your Information</h3>
            <p className="text-balean-gray-500 leading-relaxed mb-2">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-balean-gray-500 space-y-1 ml-2">
              <li>Provide and maintain the Ocean PULSE application</li>
              <li>Manage your account and authentication</li>
              <li>Process and display your observations and contributions</li>
              <li>Calculate community-driven MPA health scores</li>
              <li>Improve the application based on usage patterns (with consent)</li>
              <li>Communicate important updates about the service</li>
              <li>Ensure the security and integrity of the platform</li>
            </ul>
          </section>

          {/* 3. Data Sharing */}
          <section>
            <h3 className="text-xl font-semibold text-balean-navy mb-3">3. Data Sharing and Disclosure</h3>
            <p className="text-balean-gray-500 leading-relaxed mb-2">
              We do not sell your personal data. We may share information with:
            </p>
            <ul className="list-disc list-inside text-balean-gray-500 space-y-1 ml-2">
              <li>
                <strong>Supabase</strong> &mdash; our database and authentication provider, which processes
                your account data and stored observations
              </li>
              <li>
                <strong>Google Analytics</strong> &mdash; for anonymous usage analytics (only with your explicit consent)
              </li>
              <li>
                <strong>Sentry</strong> &mdash; for error monitoring and application stability
              </li>
            </ul>
            <p className="text-balean-gray-500 leading-relaxed mt-2">
              We may also disclose information if required by law or to protect the rights, safety,
              or security of our users or the public.
            </p>
          </section>

          {/* 4. Cookies */}
          <section>
            <h3 className="text-xl font-semibold text-balean-navy mb-3">4. Cookies and Tracking Technologies</h3>

            <h4 className="font-semibold text-balean-navy mt-4 mb-2">4.1 Strictly Necessary Cookies</h4>
            <p className="text-balean-gray-500 leading-relaxed">
              These cookies are essential for the application to function. They handle authentication sessions,
              remember your cookie preferences, and enable core features. These cannot be disabled.
            </p>

            <h4 className="font-semibold text-balean-navy mt-4 mb-2">4.2 Analytics Cookies</h4>
            <p className="text-balean-gray-500 leading-relaxed">
              With your explicit consent, we use Google Analytics to understand how visitors interact with
              Ocean PULSE. This helps us improve the application. Analytics data is collected anonymously
              and includes page views, feature usage, browser type, and approximate location.
            </p>

            <p className="text-balean-gray-500 leading-relaxed mt-2">
              You can manage your cookie preferences at any time through the cookie consent banner
              or from your Profile settings page.
            </p>
          </section>

          {/* 5. Data Retention */}
          <section>
            <h3 className="text-xl font-semibold text-balean-navy mb-3">5. Data Retention</h3>
            <p className="text-balean-gray-500 leading-relaxed">
              We retain your personal data for as long as your account is active or as needed to provide
              you with the service. Observation data is retained to support ongoing marine conservation
              research. If you delete your account, your personal data will be removed, though anonymized
              observation data may be retained for scientific purposes.
            </p>
          </section>

          {/* 6. Data Security */}
          <section>
            <h3 className="text-xl font-semibold text-balean-navy mb-3">6. Data Security</h3>
            <p className="text-balean-gray-500 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your data,
              including encryption in transit (HTTPS), secure authentication via Supabase, and
              row-level security policies on our database. However, no method of electronic
              transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          {/* 7. Your Rights Under GDPR */}
          <section>
            <h3 className="text-xl font-semibold text-balean-navy mb-3">7. Your Rights Under GDPR</h3>
            <p className="text-balean-gray-500 leading-relaxed mb-2">
              If you are in the European Economic Area, you have the following rights:
            </p>
            <ul className="list-disc list-inside text-balean-gray-500 space-y-1 ml-2">
              <li><strong>Access</strong> &mdash; request a copy of the personal data we hold about you</li>
              <li><strong>Rectification</strong> &mdash; request correction of inaccurate personal data</li>
              <li><strong>Erasure</strong> &mdash; request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
              <li><strong>Restriction</strong> &mdash; request restriction of processing your data</li>
              <li><strong>Data portability</strong> &mdash; request your data in a portable format</li>
              <li><strong>Object</strong> &mdash; object to certain types of processing</li>
              <li><strong>Withdraw consent</strong> &mdash; withdraw consent at any time where processing is based on consent</li>
            </ul>
            <p className="text-balean-gray-500 leading-relaxed mt-2">
              To exercise any of these rights, please contact us at the address below. We will respond
              within 30 days.
            </p>
          </section>

          {/* 8. Children's Privacy */}
          <section>
            <h3 className="text-xl font-semibold text-balean-navy mb-3">8. Children&apos;s Privacy</h3>
            <p className="text-balean-gray-500 leading-relaxed">
              Ocean PULSE is not directed at children under 16. We do not knowingly collect personal data
              from children under 16. If you believe we have collected data from a child, please contact us
              and we will promptly delete it.
            </p>
          </section>

          {/* Divider */}
          <hr className="border-balean-gray-100" />

          {/* TERMS OF SERVICE */}
          <section>
            <h2 className="text-2xl font-bold text-balean-navy mb-4">Terms of Service</h2>
            <p className="text-balean-gray-500 leading-relaxed">
              By accessing or using Ocean PULSE, you agree to be bound by these Terms of Service.
              If you do not agree with any part of these terms, you may not use the application.
            </p>
          </section>

          {/* T1. Use of the Service */}
          <section>
            <h3 className="text-xl font-semibold text-balean-navy mb-3">1. Use of the Service</h3>
            <p className="text-balean-gray-500 leading-relaxed mb-2">
              Ocean PULSE provides tools for exploring Marine Protected Areas, tracking marine species,
              submitting field observations, and monitoring ocean health. You agree to:
            </p>
            <ul className="list-disc list-inside text-balean-gray-500 space-y-1 ml-2">
              <li>Use the service only for lawful purposes</li>
              <li>Provide accurate information when creating an account</li>
              <li>Not misuse the service or interfere with its operation</li>
              <li>Not submit false or misleading observation data</li>
              <li>Respect the intellectual property rights of others</li>
            </ul>
          </section>

          {/* T2. Accounts */}
          <section>
            <h3 className="text-xl font-semibold text-balean-navy mb-3">2. Accounts</h3>
            <p className="text-balean-gray-500 leading-relaxed">
              Some features require an account. You are responsible for maintaining the security of your
              account credentials and for all activity that occurs under your account. You must notify us
              immediately of any unauthorized use.
            </p>
          </section>

          {/* T3. User Content */}
          <section>
            <h3 className="text-xl font-semibold text-balean-navy mb-3">3. User Content</h3>
            <p className="text-balean-gray-500 leading-relaxed">
              By submitting observations, photos, and other content to Ocean PULSE, you grant Balean a
              non-exclusive, worldwide, royalty-free license to use, display, and distribute that content
              for the purpose of operating and improving the service, and for marine conservation research.
              You retain ownership of your content and can request its removal at any time.
            </p>
          </section>

          {/* T4. External Data */}
          <section>
            <h3 className="text-xl font-semibold text-balean-navy mb-3">4. External Data Sources</h3>
            <p className="text-balean-gray-500 leading-relaxed">
              Ocean PULSE integrates data from third-party sources including OBIS (Ocean Biodiversity
              Information System), Copernicus Marine Service, MPAtlas, and Movebank. This data is provided
              &quot;as is&quot; and we make no warranties regarding its accuracy or completeness. Use of this data
              is subject to the respective providers&apos; terms and licenses.
            </p>
          </section>

          {/* T5. Disclaimers */}
          <section>
            <h3 className="text-xl font-semibold text-balean-navy mb-3">5. Disclaimers</h3>
            <p className="text-balean-gray-500 leading-relaxed">
              Ocean PULSE is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either
              express or implied. Health scores, environmental data, and species information are for
              informational purposes only and should not be used as the sole basis for conservation
              decisions. We do not guarantee the accuracy, completeness, or reliability of any data
              displayed in the application.
            </p>
          </section>

          {/* T6. Limitation of Liability */}
          <section>
            <h3 className="text-xl font-semibold text-balean-navy mb-3">6. Limitation of Liability</h3>
            <p className="text-balean-gray-500 leading-relaxed">
              To the fullest extent permitted by law, Balean shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising out of or related to your
              use of Ocean PULSE, including but not limited to loss of data, loss of profits, or
              damages resulting from reliance on information provided through the application.
            </p>
          </section>

          {/* T7. Changes */}
          <section>
            <h3 className="text-xl font-semibold text-balean-navy mb-3">7. Changes to These Terms</h3>
            <p className="text-balean-gray-500 leading-relaxed">
              We reserve the right to modify these terms at any time. Changes will be posted on this page
              with an updated date. Your continued use of Ocean PULSE after changes constitutes acceptance
              of the revised terms.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-balean-gray-50 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-balean-navy mb-3">Contact Us</h3>
            <p className="text-balean-gray-500 leading-relaxed">
              If you have questions about this Privacy Policy, the Terms of Service, or wish to exercise
              your data protection rights, please contact us at:
            </p>
            <p className="text-balean-navy font-medium mt-3">
              Balean<br />
              <a href="mailto:privacy@balean.org" className="text-balean-cyan hover:underline">
                privacy@balean.org
              </a>
            </p>
            <p className="text-balean-gray-400 text-sm mt-2">
              We aim to respond to all requests within 30 days.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
