import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </Link>

        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">1. Agreement</h2>
            <p className="text-muted-foreground">By accessing or using Stokivo ("the Service"), you agree to be bound by these Terms of Service. If you are using the Service on behalf of a business, you represent that you have authority to bind that business to these terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">2. The Service</h2>
            <p className="text-muted-foreground">Stokivo provides a cloud-based inventory management and point-of-sale platform for businesses. The Service includes stock tracking, sales processing, reporting, and related tools as described on our website.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">3. Accounts</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>You must provide accurate, complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must notify us immediately of any unauthorised access</li>
              <li>You are responsible for all activity under your account</li>
              <li>One person or business may not maintain more than one account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">4. Subscriptions & Payments</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>The Service is offered on a subscription basis with tiered pricing (Starter, Growth, Pro)</li>
              <li>All prices are in GBP and exclusive of VAT unless stated otherwise</li>
              <li>Payments are processed securely by Stripe</li>
              <li>Subscriptions renew automatically unless cancelled before the renewal date</li>
              <li>We reserve the right to change pricing with 30 days' notice</li>
              <li>Refunds are handled on a case-by-case basis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">5. Acceptable Use</h2>
            <p className="text-muted-foreground">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorised access to any part of the Service</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>Use the Service to store or transmit malicious code</li>
              <li>Resell or redistribute the Service without our written consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">6. Your Data</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>You retain ownership of all data you enter into Stokivo</li>
              <li>We process your data in accordance with our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link></li>
              <li>You can export your data at any time via the Settings page</li>
              <li>You can request deletion of your data as described in our Privacy Policy</li>
              <li>You are responsible for ensuring the accuracy of data you enter</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">7. Service Availability</h2>
            <p className="text-muted-foreground">We aim to provide 99.9% uptime but do not guarantee uninterrupted access. We may suspend the Service for maintenance with reasonable notice. We are not liable for downtime caused by factors outside our control.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">8. Limitation of Liability</h2>
            <p className="text-muted-foreground">To the maximum extent permitted by UK law:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>The Service is provided "as is" without warranties of any kind</li>
              <li>We are not liable for indirect, incidental, or consequential damages</li>
              <li>Our total liability shall not exceed the fees you paid in the 12 months preceding the claim</li>
              <li>Nothing in these terms excludes liability for death, personal injury, or fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">9. Termination</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>You may close your account at any time through Settings</li>
              <li>We may suspend or terminate accounts that violate these terms</li>
              <li>Upon termination, your data will be handled as described in our Privacy Policy</li>
              <li>Sections relating to liability, governing law, and data retention survive termination</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">10. Governing Law</h2>
            <p className="text-muted-foreground">These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">11. Changes to These Terms</h2>
            <p className="text-muted-foreground">We may update these terms from time to time. Material changes will be communicated via email or in-app notification at least 30 days before taking effect.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-foreground">12. Contact</h2>
            <p className="text-muted-foreground">For questions about these terms, contact us at <strong>legal@stokivo.com</strong>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
