import type { PaymentProvider, PaymentProviderId } from "./provider.ts";
import { StripeProvider } from "./stripe-provider.ts";
import { TeyaProvider } from "./teya-provider.ts";

const providers: Record<PaymentProviderId, PaymentProvider> = {
  stripe: new StripeProvider(),
  teya: new TeyaProvider(),
};

export function getProvider(id: PaymentProviderId): PaymentProvider {
  return providers[id];
}

export function listProviderStatus() {
  return (Object.keys(providers) as PaymentProviderId[]).map((id) => ({
    id,
    configured: providers[id].isConfigured(),
  }));
}
