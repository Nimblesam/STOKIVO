import Stripe from "https://esm.sh/stripe@18.5.0";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  CreateTerminalIntentInput,
  CreateTerminalIntentResult,
  PaymentContext,
  PaymentProvider,
} from "./provider.ts";
import { ProviderNotConfiguredError } from "./provider.ts";

export class StripeProvider implements PaymentProvider {
  id = "stripe" as const;

  private get key() {
    return Deno.env.get("STRIPE_SECRET_KEY") || "";
  }

  isConfigured(): boolean {
    return !!this.key;
  }

  private client(): Stripe {
    if (!this.isConfigured()) throw new ProviderNotConfiguredError("stripe");
    return new Stripe(this.key, { apiVersion: "2025-08-27.basil" });
  }

  async createCheckoutSession(
    ctx: PaymentContext,
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    const stripe = this.client();
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [{
        price_data: {
          currency: ctx.companyCurrency,
          product_data: { name: input.description },
          unit_amount: input.amountMinor,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
      ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
      ...(ctx.stripeAccountId
        ? {
            payment_intent_data: {
              ...(input.applicationFeeMinor
                ? { application_fee_amount: input.applicationFeeMinor }
                : {}),
              transfer_data: { destination: ctx.stripeAccountId },
            },
          }
        : {}),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    return { url: session.url ?? "", reference: session.id, provider: this.id };
  }

  async createTerminalIntent(
    ctx: PaymentContext,
    input: CreateTerminalIntentInput,
  ): Promise<CreateTerminalIntentResult> {
    const stripe = this.client();
    const pi = await stripe.paymentIntents.create({
      amount: input.amountMinor,
      currency: ctx.companyCurrency,
      payment_method_types: ["card_present"],
      capture_method: "automatic",
      metadata: input.metadata,
    });
    return { clientSecret: pi.client_secret ?? "", intentId: pi.id, provider: this.id };
  }
}
