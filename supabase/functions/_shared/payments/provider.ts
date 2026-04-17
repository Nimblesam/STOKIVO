// Unified payment provider abstraction.
// Lets Stokivo route a payment intent to Stripe or Teya behind one interface.
// Add new providers by implementing PaymentProvider and registering in router.

export type PaymentProviderId = "stripe" | "teya";

export interface PaymentContext {
  companyId: string;
  companyCurrency: string; // e.g. "gbp"
  stripeAccountId?: string | null;
  origin: string; // request origin for redirects
}

export interface CreateCheckoutInput {
  amountMinor: number; // amount in minor units (pence/cents)
  description: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  // Optional Connect-style split
  applicationFeeMinor?: number;
}

export interface CreateCheckoutResult {
  url: string;
  reference: string; // provider's session/intent id
  provider: PaymentProviderId;
}

export interface CreateTerminalIntentInput {
  amountMinor: number;
  metadata?: Record<string, string>;
}

export interface CreateTerminalIntentResult {
  clientSecret: string;
  intentId: string;
  provider: PaymentProviderId;
}

export interface PaymentProvider {
  id: PaymentProviderId;
  isConfigured(): boolean;
  createCheckoutSession(
    ctx: PaymentContext,
    input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult>;
  createTerminalIntent(
    ctx: PaymentContext,
    input: CreateTerminalIntentInput,
  ): Promise<CreateTerminalIntentResult>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(public providerId: PaymentProviderId) {
    super(`Payment provider "${providerId}" is not configured. Add the required secrets to enable it.`);
  }
}
