import { insertRow, selectMany, selectOne, upsertRow } from "./supabase.mjs";
import {
  appendUserNotification,
  findUserById,
  findUserByReferralKey,
  listUsersByReferrerKeys,
} from "./users.mjs";
import {
  commissionAmount,
  referralRateForStatus,
  walletTotals,
} from "./referrals.mjs";
import { emitNotification } from "./notifications-store.mjs";

export async function listCommissionsForUser(userId) {
  return selectMany(
    "referral_commissions",
    `referrer_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`,
  );
}

export async function getCommissionByPayment({ provider = "nowpayments", providerPaymentId, referrerId }) {
  return selectOne(
    "referral_commissions",
    `provider=eq.${encodeURIComponent(provider)}&provider_payment_id=eq.${encodeURIComponent(providerPaymentId)}&referrer_id=eq.${encodeURIComponent(referrerId)}&select=*`,
  );
}

export async function maybeCreateReferralCommission({ referee, providerPaymentId, priceAmount, provider = "nowpayments" }) {
  if (!referee?.referred_by || !providerPaymentId) {
    return { created: false, reason: "missing_referral" };
  }

  const referrer = await findUserByReferralKey(referee.referred_by);
  if (!referrer || referrer.id === referee.id) {
    return { created: false, reason: "unknown_referrer" };
  }

  const existing = await getCommissionByPayment({ provider, providerPaymentId, referrerId: referrer.id });
  if (existing) {
    return { created: false, reason: "idempotent_replay", data: existing };
  }

  const rate = referralRateForStatus(referrer.status);
  const amount = commissionAmount({ priceAmount, rate });
  if (amount <= 0) {
    return { created: false, reason: "zero_amount" };
  }

  const row = await upsertRow(
    "referral_commissions",
    {
      referrer_id: referrer.id,
      referee_id: referee.id,
      payment_id: providerPaymentId,
      provider,
      provider_payment_id: providerPaymentId,
      amount_usd: amount,
      amount_usdt: amount,
      rate,
      referrer_status_at_payout: referrer.status || "inactive",
      status: "earned",
    },
    "provider,provider_payment_id,referrer_id",
    { returning: "representation" },
  );

  await appendUserNotification(
    referrer.id,
    `Referral commission earned: ${amount.toFixed(2)} USDT from ${referee.username || referee.email || "a referred user"}.`,
  );
  await emitNotification({
    userId: referrer.id,
    eventType: "referral_commission_earned",
    payload: {
      amount,
      rate,
      rateLabel: rate ? `${Math.round(Number(rate) * 100)}%` : null,
      refereeUsername: referee.username || referee.email || null,
      providerPaymentId,
    },
  });

  return { created: true, data: row };
}

export async function listReferralUsers(user) {
  if (!user?.referral_code) return [];
  const rows = await listUsersByReferrerKeys([user.referral_code, user.username]);
  return rows.map((row) => ({
    userId: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    avatar: row.avatar,
    status: row.status || "inactive",
    joinedAt: row.created_at,
  }));
}

export async function referralSummaryForUser(userId, { withdrawals = [] } = {}) {
  const user = await findUserById(userId);
  if (!user) return null;
  const [commissions, referredUsers] = await Promise.all([
    listCommissionsForUser(userId),
    listReferralUsers(user),
  ]);
  const totals = walletTotals({ commissions, withdrawals });
  return {
    referralCode: user.referral_code,
    referralLink: `http://localhost:3000/signup?ref=${encodeURIComponent(user.username)}`,
    totals,
    referredUsers,
    commissions,
  };
}

export async function seedDevCommission({ referrerId, amountUsdt = 25 }) {
  const referrer = await findUserById(referrerId);
  if (!referrer) return null;
  const paymentId = `dev_seed_${Date.now()}`;
  const row = await insertRow(
    "referral_commissions",
    {
      referrer_id: referrer.id,
      referee_id: referrer.id,
      payment_id: paymentId,
      provider: "nowpayments",
      provider_payment_id: paymentId,
      amount_usd: amountUsdt,
      amount_usdt: amountUsdt,
      rate: referralRateForStatus(referrer.status),
      referrer_status_at_payout: referrer.status || "active",
      status: "earned",
    },
    { returning: "representation" },
  );
  await appendUserNotification(referrer.id, `Dev referral commission added: ${Number(amountUsdt).toFixed(2)} USDT.`);
  return row;
}
