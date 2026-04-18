import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  CreateTerminalIntentInput,
  CreateTerminalIntentResult,
  PaymentContext,
  PaymentProvider,
} from "./provider.ts";
import { ProviderNotConfiguredError } from "./provider.ts";

/**
 * Teya provider scaffold.
 *
 * To activate:
 *  1. Add secrets: TEYA_API_KEY, TEYA_MERCHANT_ID (and TEYA_WEBHOOK_SECRET for webhook).
 *  2. Replace the throw blocks below with real Teya REST calls:
 *      - Hosted checkout: POST {TEYA_BASE_URL}/payments/checkout-sessions
 *      - In-store SDK: mint a connection token / payment intent via Teya SoftPOS API
 *  3. Implement teya-webhook to validate signatures and confirm payments.
 *
 * Reference: https://developers.teya.com/ (replace with your Teya program docs)
 */
export class TeyaProvider implements PaymentProvider {
  id = "teya" as const;

  private get apiKey() { return Deno.env.get("TEYA_API_KEY") || ""; }
  private get merchantId() { return Deno.env.get("TEYA_MERCHANT_ID") || ""; }

  isConfigured(): boolean {
    return !!this.apiKey && !!this.merchantId;
  }

  private ensureConfigured() {
    if (!this.isConfigured()) throw new ProviderNotConfiguredError("teya");
  }

  async createCheckoutSession(
    _ctx: PaymentContext,
    _input: CreateCheckoutInput,
  ): Promise<CreateCheckoutResult> {
    this.ensureConfigured();
    // TODO: call Teya hosted checkout API and return its redirect URL + session id.
    throw new Error("Teya hosted checkout integration pending: implement createCheckoutSession.");
  }

  async createTerminalIntent(
    _ctx: PaymentContext,
    _input: CreateTerminalIntentInput,
  ): Promise<CreateTerminalIntentResult> {
    this.ensureConfigured();
    // TODO: call Teya SoftPOS / Tap-to-Pay API and return clientSecret + intent id.
    throw new Error("Teya Tap to Pay integration pending: implement createTerminalIntent.");
  }
}
