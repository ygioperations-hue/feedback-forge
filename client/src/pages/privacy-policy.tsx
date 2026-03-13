import { Link } from "wouter";
import { usePageSEO } from "@/hooks/use-page-seo";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  usePageSEO({
    title: "Privacy Policy",
    description: "Read FeedbackForge's Privacy Policy to understand how we collect, use, and protect your personal data.",
    canonicalPath: "/privacy",
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          data-testid="link-privacy-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: March 2026</p>

        <div className="space-y-8">

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              FeedbackForge ("we", "us", or "our") is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, and your rights regarding that data when you use FeedbackForge at feedbackforge.co (the "Service").
            </p>
            <p className="text-muted-foreground leading-relaxed">
              By using the Service, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">We collect the following types of information:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Account information:</strong> Your first name, last name, and email address when you sign up.</li>
              <li><strong className="text-foreground">Payment information:</strong> Billing is handled by Stripe. We do not store your credit card details — Stripe processes and stores payment data on our behalf.</li>
              <li><strong className="text-foreground">Project and form data:</strong> The projects, questions, and feedback responses you create and collect through the Service.</li>
              <li><strong className="text-foreground">Usage data:</strong> Basic information about how you use the Service, such as pages visited and features used, to help us improve the product.</li>
              <li><strong className="text-foreground">Session data:</strong> We use session cookies to keep you logged in. These are stored securely and expire when you log out or after a period of inactivity.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process payments and manage your account</li>
              <li>Send you transactional emails (e.g. password resets, payment confirmation)</li>
              <li>Generate AI-powered insights from feedback data you submit for analysis</li>
              <li>Respond to support requests</li>
              <li>Detect and prevent fraud or abuse</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal data to third parties. We do not use your data for advertising.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">We use trusted third-party providers to operate the Service:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Stripe</strong> — Payment processing. Your payment data is governed by <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="underline decoration-muted-foreground hover:text-foreground hover:decoration-foreground transition-colors">Stripe's Privacy Policy</a>.</li>
              <li><strong className="text-foreground">OpenAI</strong> — Powers the AI insights feature. Feedback text you submit for analysis is sent to OpenAI's API. OpenAI does not use API data to train its models by default. See <a href="https://openai.com/policies/api-data-usage-policies" target="_blank" rel="noopener noreferrer" className="underline decoration-muted-foreground hover:text-foreground hover:decoration-foreground transition-colors">OpenAI's API data usage policy</a>.</li>
              <li><strong className="text-foreground">PostgreSQL database hosting</strong> — Your data is stored in a managed PostgreSQL database with encrypted connections.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use a single session cookie to keep you authenticated while you use the Service. This cookie is strictly necessary for the Service to function and does not track you across other websites. We do not use advertising or analytics cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your account data for as long as your account is active. If you request account deletion, we will delete your personal data within 30 days, except where we are required to retain it for legal or financial record-keeping purposes (e.g. payment records).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Feedback responses submitted by your users through your forms are retained as long as your account is active or until you delete them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">Depending on your location, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate personal data</li>
              <li>Request deletion of your personal data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Export your data in a portable format</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              To exercise any of these rights, contact us at <a href="mailto:support@feedbackforge.co" className="underline decoration-muted-foreground hover:text-foreground hover:decoration-foreground transition-colors">support@feedbackforge.co</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We take reasonable measures to protect your data, including encrypted database connections, hashed passwords (bcrypt), and secure session management. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              FeedbackForge is not directed at children under the age of 16. We do not knowingly collect personal data from anyone under 16. If you believe we have inadvertently collected such data, please contact us and we will delete it promptly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. Continued use of the Service after changes are posted constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-muted-foreground">
              <a href="mailto:support@feedbackforge.co" className="underline decoration-muted-foreground hover:text-foreground hover:decoration-foreground transition-colors">support@feedbackforge.co</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
