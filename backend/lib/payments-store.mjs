import { selectOne, upsertRow } from "./supabase.mjs";

export async function getPaymentById(provider, providerPaymentId) {
  return selectOne(
    "payments",
    `provider=eq.${encodeURIComponent(provider)}&provider_payment_id=eq.${encodeURIComponent(providerPaymentId)}&select=*`,
  );
}

export async function recordPayment({
  userId,
  provider,
  providerPaymentId,
  orderId,
  priceAmount,
  priceCurrency,
  payAmount,
  payCurrency,
  status,
  rawPayload,
}) {
  await upsertRow(
    "payments",
    {
      user_id: userId,
      provider,
      provider_payment_id: providerPaymentId,
      order_id: orderId,
      price_amount: priceAmount,
      price_currency: priceCurrency,
      pay_amount: payAmount,
      pay_currency: payCurrency,
      status,
      raw_payload: rawPayload,
    },
    "provider,provider_payment_id",
  );
}
