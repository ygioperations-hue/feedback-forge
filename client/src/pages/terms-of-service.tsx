import { Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  usePageTitle("Terms of Service");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/">
          <a className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </a>
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: March 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using FeedbackForge ("Service") at feedbackforge.co, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              These Terms apply to all visitors, users, and customers of FeedbackForge. We reserve the right to update these Terms at any time. Continued use of the Service after changes are posted constitutes your acceptance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed">
              To use the Service, you must create an account with a valid email address and password. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 16 years old to create an account. You agree to provide accurate and complete information when registering and to keep your information up to date.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You may not share your account with others or create multiple accounts for the purpose of circumventing limits or policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. Lifetime Deal — Billing and Payment</h2>
            <p className="text-muted-foreground leading-relaxed">
              FeedbackForge currently offers a Lifetime Deal for a one-time payment of $59 USD. This grants you permanent access to the Service, including all features available at the time of purchase and future updates released during the lifetime of the product.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              All payments are processed securely by Stripe. By completing a purchase, you agree to Stripe's Terms of Service. All sales are final. Refunds may be issued at our discretion within 14 days of purchase if the Service does not function as described — contact us at <a href="mailto:support@feedbackforge.co" className="underline hover:text-foreground">support@feedbackforge.co</a>.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              "Lifetime" refers to the operational lifetime of FeedbackForge as a product. We reserve the right to discontinue the Service with reasonable notice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">You agree not to use the Service to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Collect feedback from individuals without their knowledge or consent</li>
              <li>Store, transmit, or solicit sensitive personal data such as passwords, financial account details, or government ID numbers through feedback forms</li>
              <li>Send spam, unsolicited messages, or engage in any abusive or harassing conduct</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Attempt to reverse engineer, copy, or resell any part of the Service</li>
              <li>Use the Service in a way that could damage, disable, or impair its infrastructure</li>
              <li>Upload or transmit malicious code, viruses, or any harmful software</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate accounts that violate these guidelines without refund.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">5. Your Content and Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of all content you create through the Service — including feedback forms, projects, roadmap items, and changelogs. By using the Service, you grant FeedbackForge a limited license to store and process your content solely for the purpose of providing the Service to you.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for ensuring that the feedback you collect from your users complies with applicable privacy laws (including GDPR where relevant) and that you have informed your users that their responses will be collected.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">6. AI Features</h2>
            <p className="text-muted-foreground leading-relaxed">
              FeedbackForge uses OpenAI's API to generate AI-powered insights from your feedback data. When you use this feature, the relevant feedback text is sent to OpenAI for processing. We recommend not including personally identifiable information in feedback questions where AI insights will be used.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              AI-generated insights are provided for informational purposes only. We do not guarantee the accuracy or completeness of AI-generated summaries.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">7. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service, including its design, code, branding, and features, is owned by FeedbackForge and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works from any part of the Service without our written permission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">8. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, error-free, or completely secure. We disclaim all warranties to the fullest extent permitted by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, FeedbackForge shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, revenue, or profits, arising out of or related to your use of the Service — even if we have been advised of the possibility of such damages.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Our total liability to you for any claim arising from your use of the Service shall not exceed the amount you paid us in the twelve months preceding the claim, or $59, whichever is greater.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">10. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may stop using the Service at any time. We reserve the right to suspend or terminate your access to the Service at any time if you violate these Terms, with or without notice.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Upon termination, your right to use the Service ceases immediately. Data associated with your account may be deleted in accordance with our Privacy Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">11. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by and construed in accordance with applicable law. Any disputes arising from these Terms or your use of the Service shall be resolved through good-faith negotiation first, and if unresolved, through binding arbitration or the courts of competent jurisdiction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">12. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="text-muted-foreground">
              <a href="mailto:support@feedbackforge.co" className="underline hover:text-foreground">support@feedbackforge.co</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
