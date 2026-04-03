import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </Link>

        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">1. Who We Are</h2>
            <p className="text-muted-foreground">Stokivo ("we", "our", "us") is a UK-based inventory management and point-of-sale platform. We act as the data controller for personal data processed through our platform. If you have questions about this policy, contact us at <strong>privacy@stokivo.com</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">2. What Data We Collect</h2>
            <p className="text-muted-foreground">We collect and process the following categories of personal data:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Account data:</strong> Name, email address, and password (securely hashed) when you register</li>
              <li><strong>Business data:</strong> Company name, address, phone number, and business type</li>
              <li><strong>Usage data:</strong> Sales transactions, inventory records, and operational data you enter</li>
              <li><strong>Technical data:</strong> IP address, browser type, and device information for security and performance</li>
              <li><strong>Payment data:</strong> Billing information processed securely by Stripe — we never store card details</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">3. Lawful Basis for Processing</h2>
            <p className="text-muted-foreground">Under UK GDPR, we process your data based on:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Contract:</strong> Processing necessary to provide the Stokivo service you signed up for</li>
              <li><strong>Legitimate interest:</strong> Improving our service, preventing fraud, and ensuring platform security</li>
              <li><strong>Legal obligation:</strong> Complying with UK laws including tax and financial reporting requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">4. How We Use Your Data</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>To provide and operate the Stokivo platform</li>
              <li>To process payments and manage subscriptions via Stripe</li>
              <li>To send service-related communications (e.g., security alerts, billing)</li>
              <li>To provide customer support</li>
              <li>To detect and prevent fraud and security threats</li>
              <li>To improve our platform and develop new features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">5. Data Sharing</h2>
            <p className="text-muted-foreground">We share data only with:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Stripe:</strong> For payment processing (as a data processor under GDPR)</li>
              <li><strong>Supabase (Cloud infrastructure):</strong> For hosting and database services</li>
              <li><strong>Law enforcement:</strong> When legally required by UK law</li>
            </ul>
            <p className="text-muted-foreground">We do <strong>not</strong> sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">6. Data Security</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>All data is encrypted in transit (TLS/HTTPS) and at rest</li>
              <li>Passwords are securely hashed using industry-standard algorithms</li>
              <li>Multi-tenant isolation prevents cross-merchant data access</li>
              <li>Role-based access control (RBAC) restricts data access within organisations</li>
              <li>Admin accounts have brute-force protection and session timeouts</li>
              <li>All critical actions are recorded in immutable audit logs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">7. Your Rights (UK GDPR)</h2>
            <p className="text-muted-foreground">Under UK GDPR, you have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li><strong>Access:</strong> Request a copy of all data we hold about you</li>
              <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Restriction:</strong> Request we limit processing of your data</li>
              <li><strong>Object:</strong> Object to processing based on legitimate interests</li>
            </ul>
            <p className="text-muted-foreground">To exercise any of these rights, use the <strong>Data & Privacy</strong> section in your account Settings, or contact us at <strong>privacy@stokivo.com</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">8. Data Retention</h2>
            <p className="text-muted-foreground">We retain your data for as long as your account is active. After account deletion:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Personal data is deleted within 30 days</li>
              <li>Financial records may be retained for up to 7 years as required by UK tax law (HMRC)</li>
              <li>Anonymised analytics data may be retained indefinitely</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">9. Cookies</h2>
            <p className="text-muted-foreground">We use essential cookies only for authentication and session management. We do not use advertising or tracking cookies. Essential cookies do not require consent under UK PECR as they are strictly necessary for the service to function.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">10. International Transfers</h2>
            <p className="text-muted-foreground">Your data may be processed in countries outside the UK. Where this occurs, we ensure adequate protection through Standard Contractual Clauses (SCCs) or equivalent safeguards as required by UK GDPR.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">11. Complaints</h2>
            <p className="text-muted-foreground">If you are unhappy with how we handle your data, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ico.org.uk</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">12. Changes to This Policy</h2>
            <p className="text-muted-foreground">We may update this policy from time to time. We will notify you of significant changes via email or in-app notification.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
